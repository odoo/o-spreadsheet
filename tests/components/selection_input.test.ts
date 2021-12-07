import { Component, hooks, tags } from "@odoo/owl";
import { Model } from "../../src";
import { SelectionInput } from "../../src/components/selection_input";
import { activateSheet, createSheet, selectCell, undo } from "../test_helpers/commands_helpers";
import { simulateClick } from "../test_helpers/dom_helper";
import { makeTestFixture, nextTick } from "../test_helpers/helpers";

const { xml } = tags;
const { useSubEnv, onMounted, onWillUnmount } = hooks;

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
      t-on-selection-changed="onChanged"/>
  `;
  static components = { SelectionInput };
  model: Model;
  initialRanges: string[] | undefined;
  hasSingleRange: boolean | undefined;
  onChanged: jest.Mock<void, [any]>;

  constructor(model: Model, config: SelectionInputTestConfig) {
    super();
    useSubEnv({
      dispatch: model.dispatch,
      getters: model.getters,
      uuidGenerator: model.uuidGenerator,
    });
    this.initialRanges = config.initialRanges;
    this.hasSingleRange = config.hasSingleRange;
    this.model = model;
    this.onChanged = config.onChanged || jest.fn();
  }

  get id(): string {
    const selectionInput = Object.values(this.__owl__.children)[0] as SelectionInput;
    return selectionInput["id"];
  }

  setup() {
    onMounted(() => {
      this.model.on("update", this, this.render);
      this.render();
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
  model: Model;

  constructor(model: Model) {
    super();
    useSubEnv({
      dispatch: model.dispatch,
      getters: model.getters,
      uuidGenerator: model.uuidGenerator,
    });
    this.model = model;
  }

  setup() {
    onMounted(() => {
      this.model.on("update", this, this.render);
      this.render();
    });
    onWillUnmount(() => this.model.off("update", this));
  }
}

async function createSelectionInput(config: SelectionInputTestConfig = {}) {
  model = new Model();
  const parent = new Parent(model, config);
  await parent.mount(fixture);
  await nextTick();
  const id = parent.id;
  return { parent, model, id };
}

describe("Selection Input", () => {
  beforeEach(async () => {
    fixture = makeTestFixture();
  });

  afterEach(() => {
    fixture.remove();
  });

  test("empty input is not colored", async () => {
    await createSelectionInput();
    expect(fixture.querySelectorAll("input")[0].getAttribute("style")).toBe("color: #000;");
  });

  test("remove button is not displayed with a single input", async () => {
    await createSelectionInput();
    expect(fixture.querySelectorAll(".o-remove-selection").length).toBeFalsy();
  });

  test("remove button is displayed with more than one input", async () => {
    await createSelectionInput();
    await simulateClick(".o-add-selection");
    expect(fixture.querySelectorAll(".o-remove-selection").length).toBe(2);
  });

  test("input is filled when new cells are selected", async () => {
    const { model } = await createSelectionInput();
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
  });

  test("input is not filled with highlight when maximum ranges reached", async () => {
    const { model } = await createSelectionInput({ hasSingleRange: true });
    expect(fixture.querySelectorAll("input")).toHaveLength(1);
    model.dispatch("PREPARE_SELECTION_EXPANSION");
    model.dispatch("START_SELECTION_EXPANSION");
    selectCell(model, "B2");
    await nextTick();
    expect(fixture.querySelectorAll("input")).toHaveLength(1);
    expect(fixture.querySelector("input")!.value).toBe("B2");
    expect(fixture.querySelector(".o-add-selection")).toBeNull();
  });

  test("new range is added when button clicked", async () => {
    await createSelectionInput();
    expect(fixture.querySelectorAll("input").length).toBe(1);
    await simulateClick(".o-add-selection");
    expect(fixture.querySelectorAll("input").length).toBe(2);
  });

  test("can set initial ranges", async () => {
    await createSelectionInput({ initialRanges: ["C4", "A1"] });
    expect(fixture.querySelectorAll("input").length).toBe(2);
    expect(fixture.querySelectorAll("input")[0].value).toBe("C4");
    expect(fixture.querySelectorAll("input")[1].value).toBe("A1");
  });

  test("can focus a range", async () => {
    await createSelectionInput();
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
  });

  test("unmounting deletes the state", async () => {
    const { parent, model, id } = await createSelectionInput();
    expect(model.getters.getSelectionInput(id).length).toBe(1);
    parent.unmount();
    expect(model.getters.getSelectionInput(id).length).toBe(0);
  });

  test("can unfocus all inputs with the OK button", async () => {
    await createSelectionInput();
    expect(fixture.querySelector(".o-focused")).toBeTruthy();
    await simulateClick(".o-selection-ok");
    expect(fixture.querySelector(".o-focused")).toBeFalsy();
  });

  test("manually input a single cell", async () => {
    const { model, id } = await createSelectionInput();
    await writeInput(0, "C2");
    expect(fixture.querySelectorAll("input")[0].value).toBe("C2");
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("C2");
  });

  test("manually input multiple cells", async () => {
    const { model, id } = await createSelectionInput();
    await writeInput(0, "C2,A1");
    expect(fixture.querySelectorAll("input")[0].value).toBe("C2");
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("C2");
    expect(fixture.querySelectorAll("input")[1].value).toBe("A1");
    expect(model.getters.getSelectionInput(id)[1].xc).toBe("A1");
  });

  test("manually add another cell", async () => {
    const { model, id } = await createSelectionInput({ initialRanges: ["C2"] });
    await writeInput(0, "C2,A1");
    expect(fixture.querySelectorAll("input")[0].value).toBe("C2");
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("C2");
    expect(fixture.querySelectorAll("input")[1].value).toBe("A1");
    expect(model.getters.getSelectionInput(id)[1].xc).toBe("A1");
  });

  test("changed event is triggered when input changed", async () => {
    let newRanges;
    const onChanged = jest.fn(({ detail }) => {
      newRanges = detail.ranges;
    });
    await createSelectionInput({ onChanged });
    await writeInput(0, "C2");
    expect(onChanged).toHaveBeenCalled();
    expect(newRanges).toStrictEqual(["C2"]);
  });

  test("changed event is triggered when cell is selected", async () => {
    let newRanges;
    const onChanged = jest.fn(({ detail }) => {
      newRanges = detail.ranges;
    });
    const { model } = await createSelectionInput({ onChanged });
    selectCell(model, "B4");
    await nextTick();
    expect(onChanged).toHaveBeenCalled();
    expect(newRanges).toStrictEqual(["B4"]);
  });

  test("focus is transferred from one input to another", async () => {
    model = new Model();
    const parent = new MultiParent(model);
    await parent.mount(fixture);
    await nextTick();
    expect(fixture.querySelector(".input-1 .o-focused")).toBeTruthy();
    expect(fixture.querySelector(".input-2 .o-focused")).toBeFalsy();
    await simulateClick(".input-2 input");
    expect(fixture.querySelector(".input-1 .o-focused")).toBeFalsy();
    expect(fixture.querySelector(".input-2 .o-focused")).toBeTruthy();
  });

  test("go back to initial sheet when selection is finished", async () => {
    const { model } = await createSelectionInput();
    const sheet1Id = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42", activate: true });
    await createSelectionInput();
    activateSheet(model, "42");
    selectCell(model, "B4");
    await nextTick();
    expect(fixture.querySelector("input")!.value).toBe("Sheet2!B4");
    await simulateClick(".o-selection-ok");
    expect(model.getters.getActiveSheetId()).toBe(sheet1Id);
  });

  test("undo after selection won't change active sheet", async () => {
    const { model } = await createSelectionInput();
    const sheet1Id = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42" });
    await createSelectionInput();
    activateSheet(model, "42");
    selectCell(model, "B4");
    await nextTick();
    await simulateClick(".o-selection-ok");
    expect(model.getters.getActiveSheetId()).toBe(sheet1Id);
    undo(model);
    expect(model.getters.getActiveSheetId()).toBe(sheet1Id);
  });
  test("show red border if and only if invalid range", async () => {
    await createSelectionInput();
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
  });
  test("don't show red border initially", async () => {
    await createSelectionInput();
    expect(fixture.querySelectorAll("input")[0].classList).not.toContain("o-invalid");
  });
});
