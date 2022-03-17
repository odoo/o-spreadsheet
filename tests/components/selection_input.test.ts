import { App, Component, onMounted, onWillUnmount, useSubEnv, xml } from "@odoo/owl";
import { Model } from "../../src";
import { SelectionInput } from "../../src/components/selection_input";
import { OPEN_CF_SIDEPANEL_ACTION } from "../../src/registries";
import { activateSheet, createSheet, selectCell, undo } from "../test_helpers/commands_helpers";
import { clickCell, keyDown, keyUp, simulateClick } from "../test_helpers/dom_helper";
import {
  getChildFromComponent,
  makeTestFixture,
  mountSpreadsheet,
  nextTick,
} from "../test_helpers/helpers";

let model: Model;
let fixture: HTMLElement;

function focus(index = 0) {
  fixture.querySelectorAll("input")[index].dispatchEvent(new Event("focus"));
}

async function writeInput(index: number, text: string) {
  focus(index);
  await nextTick();
  const input = fixture.querySelectorAll("input")[index];
  input.value = text;
  input.dispatchEvent(new Event("input"));
  input.dispatchEvent(new Event("change"));
  await nextTick();
}

interface SelectionInputTestConfig {
  initialRanges?: string[];
  hasSingleRange?: boolean;
  onChanged?: jest.Mock<void, [any]>;
}

class Parent extends Component<any> {
  static template = xml/* xml */ `
    <SelectionInput
      ranges="initialRanges"
      hasSingleRange="hasSingleRange"
      onSelectionChanged="(ranges) => this.onChanged(ranges)" />
  `;
  static components = { SelectionInput };
  model!: Model;
  initialRanges: string[] | undefined;
  hasSingleRange: boolean | undefined;
  onChanged!: jest.Mock<void, [any]>;

  get id(): string {
    const selectionInput = getChildFromComponent(this, SelectionInput);
    return selectionInput["id"];
  }

  setup() {
    useSubEnv({
      model: this.props.model,
    });
    this.initialRanges = this.props.config.initialRanges;
    this.hasSingleRange = this.props.config.hasSingleRange;
    this.model = model;
    this.onChanged = this.props.config.onChanged || jest.fn();
    onMounted(() => {
      this.model.on("update", this, () => this.render(true));
      this.render(true);
    });
    onWillUnmount(() => this.model.off("update", this));
  }
}

class MultiParent extends Component<any> {
  static template = xml/* xml */ `
    <div>
      <div class="input-1">
        <SelectionInput/>
      </div>
      <div class="input-2">
        <SelectionInput/>
      </div>
    </div>
  `;
  static components = { SelectionInput };

  setup() {
    useSubEnv({
      model: this.props.model,
    });
    onMounted(() => {
      this.props.model.on("update", this, () => this.render(true));
      this.render(true);
    });
    onWillUnmount(() => this.props.model.off("update", this));
  }
}

async function createSelectionInput(config: SelectionInputTestConfig = {}) {
  model = new Model();
  const app = new App(Parent, { props: { model, config } });
  const parent = await app.mount(fixture);
  await nextTick();
  const id = parent.id;
  return { parent, model, id, app };
}

describe("Selection Input", () => {
  beforeEach(async () => {
    fixture = makeTestFixture();
  });

  afterEach(() => {
    fixture.remove();
  });

  test("empty input is not colored", async () => {
    const { app } = await createSelectionInput();
    expect(fixture.querySelectorAll("input")[0].getAttribute("style")).toBe("color: #000;");
    app.destroy();
  });

  test("remove button is not displayed with a single input", async () => {
    const { app } = await createSelectionInput();
    expect(fixture.querySelectorAll(".o-remove-selection").length).toBeFalsy();
    app.destroy();
  });

  test("remove button is displayed with more than one input", async () => {
    const { app } = await createSelectionInput();
    await simulateClick(".o-add-selection");
    expect(fixture.querySelectorAll(".o-remove-selection").length).toBe(2);
    app.destroy();
  });

  test("input is filled when new cells are selected", async () => {
    const { app, model } = await createSelectionInput();
    selectCell(model, "B4");
    await nextTick();
    expect(fixture.querySelector("input")!.value).toBe("B4");
    const color = model.getters.getHighlights()[0].color;
    expect(fixture.querySelector("input")!.getAttribute("style")).toBe(`color: ${color};`);
    simulateClick(".o-add-selection");
    selectCell(model, "B5");
    await nextTick();
    const color2 = model.getters.getHighlights()[1].color;
    expect(fixture.querySelectorAll("input")[0].value).toBe("B4");
    expect(fixture.querySelectorAll("input")[0].getAttribute("style")).toBe(`color: ${color};`);
    expect(fixture.querySelectorAll("input")[1].value).toBe("B5");
    expect(fixture.querySelectorAll("input")[1].getAttribute("style")).toBe(`color: ${color2};`);
    app.destroy();
  });

  test("ctrl + select cell --> add new input", async () => {
    const { app, parent } = await mountSpreadsheet(fixture);
    OPEN_CF_SIDEPANEL_ACTION(parent.env);
    await nextTick();
    await simulateClick(".o-cf-add");
    await nextTick();
    const input = fixture.querySelector(".o-selection-input input") as HTMLInputElement;
    await simulateClick(input);
    clickCell(parent.model, "B4");
    await nextTick();
    await keyDown("Control");
    clickCell(parent.model, "B5");
    await keyUp("Control");
    const inputs = fixture.querySelectorAll(
      ".o-selection-input input"
    ) as unknown as HTMLInputElement[];
    expect(inputs.length).toBe(2);
    expect(inputs[0].value).toBe("B4");
    expect(inputs[1].value).toBe("B5");
    app.destroy();
  });

  test("input is not filled with highlight when maximum ranges reached", async () => {
    const { app, model } = await createSelectionInput({ hasSingleRange: true });
    expect(fixture.querySelectorAll("input")).toHaveLength(1);
    model.dispatch("PREPARE_SELECTION_INPUT_EXPANSION");
    selectCell(model, "B2");
    await nextTick();
    expect(fixture.querySelectorAll("input")).toHaveLength(1);
    expect(fixture.querySelector("input")!.value).toBe("B2");
    expect(fixture.querySelector(".o-add-selection")).toBeNull();
    app.destroy();
  });

  test("new range is added when button clicked", async () => {
    const { app } = await createSelectionInput();
    expect(fixture.querySelectorAll("input").length).toBe(1);
    await simulateClick(".o-add-selection");
    expect(fixture.querySelectorAll("input").length).toBe(2);
    app.destroy();
  });

  test("can set initial ranges", async () => {
    const { app } = await createSelectionInput({ initialRanges: ["C4", "A1"] });
    expect(fixture.querySelectorAll("input").length).toBe(2);
    expect(fixture.querySelectorAll("input")[0].value).toBe("C4");
    expect(fixture.querySelectorAll("input")[1].value).toBe("A1");
    app.destroy();
  });

  test("can focus a range", async () => {
    const { app } = await createSelectionInput();
    await simulateClick(".o-add-selection"); // last input is now focused
    expect([...fixture.querySelectorAll("input")].map((i) => i.className)).toEqual([
      "",
      "o-focused",
    ]);
    await simulateClick("input"); // focus the first input
    expect([...fixture.querySelectorAll("input")].map((i) => i.className)).toEqual([
      "o-focused",
      "",
    ]);
    app.destroy();
  });

  test("unmounting deletes the state", async () => {
    const { app, model, id } = await createSelectionInput();
    expect(model.getters.getSelectionInput(id).length).toBe(1);
    app.destroy();
    expect(model.getters.getSelectionInput(id).length).toBe(0);
  });

  test("can unfocus all inputs with the OK button", async () => {
    const { app } = await createSelectionInput();
    expect(fixture.querySelector(".o-focused")).toBeTruthy();
    await simulateClick(".o-selection-ok");
    expect(fixture.querySelector(".o-focused")).toBeFalsy();
    app.destroy();
  });

  test("manually input a single cell", async () => {
    const { app, model, id } = await createSelectionInput();
    await writeInput(0, "C2");
    expect(fixture.querySelectorAll("input")[0].value).toBe("C2");
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("C2");
    app.destroy();
  });

  test("manually input multiple cells", async () => {
    const { app, model, id } = await createSelectionInput();
    await writeInput(0, "C2,A1");
    expect(fixture.querySelectorAll("input")[0].value).toBe("C2");
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("C2");
    expect(fixture.querySelectorAll("input")[1].value).toBe("A1");
    expect(model.getters.getSelectionInput(id)[1].xc).toBe("A1");
    app.destroy();
  });

  test("manually add another cell", async () => {
    const { app, model, id } = await createSelectionInput({ initialRanges: ["C2"] });
    await writeInput(0, "C2,A1");
    expect(fixture.querySelectorAll("input")[0].value).toBe("C2");
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("C2");
    expect(fixture.querySelectorAll("input")[1].value).toBe("A1");
    expect(model.getters.getSelectionInput(id)[1].xc).toBe("A1");
    app.destroy();
  });

  test("changed event is triggered when input changed", async () => {
    let newRanges;
    const onChanged = jest.fn((ranges) => {
      newRanges = ranges;
    });
    const { app } = await createSelectionInput({ onChanged });
    await writeInput(0, "C2");
    expect(onChanged).toHaveBeenCalled();
    expect(newRanges).toStrictEqual(["C2"]);
    app.destroy();
  });

  test("changed event is triggered when cell is selected", async () => {
    let newRanges;
    const onChanged = jest.fn((ranges) => {
      newRanges = ranges;
    });
    const { app, model } = await createSelectionInput({ onChanged });
    selectCell(model, "B4");
    await nextTick();
    expect(onChanged).toHaveBeenCalled();
    expect(newRanges).toStrictEqual(["B4"]);
    app.destroy();
  });

  test("focus is transferred from one input to another", async () => {
    model = new Model();
    const app = new App(MultiParent, { props: { model } });
    await app.mount(fixture);
    await nextTick();
    expect(fixture.querySelector(".input-1 .o-focused")).toBeTruthy();
    expect(fixture.querySelector(".input-2 .o-focused")).toBeFalsy();
    await simulateClick(".input-2 input");
    expect(fixture.querySelector(".input-1 .o-focused")).toBeFalsy();
    expect(fixture.querySelector(".input-2 .o-focused")).toBeTruthy();
    app.destroy();
  });

  test("go back to initial sheet when selection is finished", async () => {
    const { app, model } = await createSelectionInput();
    const sheet1Id = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42", activate: true });
    const { app: app1 } = await createSelectionInput();
    activateSheet(model, "42");
    selectCell(model, "B4");
    await nextTick();
    expect(fixture.querySelector("input")!.value).toBe("Sheet2!B4");
    await simulateClick(".o-selection-ok");
    expect(model.getters.getActiveSheetId()).toBe(sheet1Id);
    app.destroy();
    app1.destroy();
  });

  test("undo after selection won't change active sheet", async () => {
    const { app, model } = await createSelectionInput();
    const sheet1Id = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42" });
    const { app: app1 } = await createSelectionInput();
    activateSheet(model, "42");
    selectCell(model, "B4");
    await nextTick();
    await simulateClick(".o-selection-ok");
    expect(model.getters.getActiveSheetId()).toBe(sheet1Id);
    undo(model);
    expect(model.getters.getActiveSheetId()).toBe(sheet1Id);
    app.destroy();
    app1.destroy();
  });
  test("show red border if and only if invalid range", async () => {
    const { app } = await createSelectionInput();
    await writeInput(0, "A1");
    expect(fixture.querySelectorAll("input")[0].value).toBe("A1");
    expect(fixture.querySelectorAll("input")[0].getAttribute("style")).not.toBe("color: #000;");
    expect(fixture.querySelectorAll("input")[0].classList).not.toContain("o-invalid");
    await writeInput(0, "aaaaa");
    expect(fixture.querySelectorAll("input")[0].value).toBe("aaaaa");
    expect(fixture.querySelectorAll("input")[0].getAttribute("style")).toBe("color: #000;");
    expect(fixture.querySelectorAll("input")[0].classList).toContain("o-invalid");
    await writeInput(0, "B1");
    expect(fixture.querySelectorAll("input")[0].value).toBe("B1");
    expect(fixture.querySelectorAll("input")[0].getAttribute("style")).not.toBe("color: #000;");
    expect(fixture.querySelectorAll("input")[0].classList).not.toContain("o-invalid");
    app.destroy();
  });
  test("don't show red border initially", async () => {
    const { app } = await createSelectionInput();
    expect(fixture.querySelectorAll("input")[0].classList).not.toContain("o-invalid");
    app.destroy();
  });

  test("pressing and releasing control has no effect on future clicks", async () => {
    const { app, parent } = await mountSpreadsheet(fixture);
    OPEN_CF_SIDEPANEL_ACTION(parent.env);
    await nextTick();
    await simulateClick(".o-cf-add");
    await nextTick();
    let input = fixture.querySelector(".o-selection-input input") as HTMLInputElement;
    await simulateClick(input);
    expect(input.value).toBe("A1");
    await keyDown("Control");
    await keyUp("Control");
    await clickCell(parent.model, "A2");
    expect(fixture.querySelectorAll(".o-selection-input input")).toHaveLength(1);
    input = fixture.querySelector(".o-selection-input input") as HTMLInputElement;
    expect(input.value).toBe("A2");
    app.destroy();
  });
});
