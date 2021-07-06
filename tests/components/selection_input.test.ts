import { Component, hooks, tags } from "@odoo/owl";
import { Model } from "../../src";
import { SelectionInput } from "../../src/components/selection_input";
import { activateSheet, createSheet, selectCell, undo } from "../test_helpers/commands_helpers";
import { simulateClick } from "../test_helpers/dom_helper";
import { makeTestFixture, nextTick } from "../test_helpers/helpers";

const { xml } = tags;
const { useSubEnv, useRef } = hooks;

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
  maximumRanges?: number;
  onChanged?: jest.Mock<void, [any]>;
}

class Parent extends Component<any> {
  static template = xml/* xml */ `
    <SelectionInput
      t-ref="selection-input"
      ranges="initialRanges"
      maximumRanges="maximumRanges"
      t-on-selection-changed="onChanged"/>
  `;
  static components = { SelectionInput };
  model: Model;
  initialRanges: string[] | undefined;
  maximumRanges: number | undefined;
  ref = useRef("selection-input");
  onChanged: jest.Mock<void, [any]>;

  constructor(model: Model, config: SelectionInputTestConfig) {
    super();
    useSubEnv({
      dispatch: model.dispatch,
      getters: model.getters,
    });
    this.initialRanges = config.initialRanges;
    this.maximumRanges = config.maximumRanges;
    this.model = model;
    this.onChanged = config.onChanged || jest.fn();
  }

  get id(): string {
    return (this.ref.comp as any).id;
  }

  mounted() {
    this.model.on("update", this, this.render);
    this.render();
  }

  willUnmount() {
    this.model.off("update", this);
  }
}

class MutliParent extends Component<any> {
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
    });
    this.model = model;
  }

  mounted() {
    this.model.on("update", this, this.render);
    this.render();
  }

  willUnmount() {
    this.model.off("update", this);
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

  test("remove button is not displayed with a single input", async () => {
    await createSelectionInput();
    expect(fixture.querySelectorAll(".o-remove-selection").length).toBeFalsy();
  });

  test("remove button is displayed with more than one input", async () => {
    await createSelectionInput();
    await simulateClick(".o-add-selection");
    expect(fixture.querySelectorAll(".o-remove-selection").length).toBe(2);
  });

  test("input is filled when new highlight is added", async () => {
    const { model } = await createSelectionInput();
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: {
        B4: { quantity: 1, color: "#454545" },
      },
    });
    await nextTick();
    expect(fixture.querySelector("input")!.value).toBe("B4");
    expect(fixture.querySelector("input")!.getAttribute("style")).toBe("color: #454545;");
    simulateClick(".o-add-selection");
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: {
        B5: { quantity: 1, color: "#787878" },
      },
    });
    await nextTick();
    expect(fixture.querySelectorAll("input")[0].value).toBe("B4");
    expect(fixture.querySelectorAll("input")[0].getAttribute("style")).toBe("color: #454545;");
    expect(fixture.querySelectorAll("input")[1].value).toBe("B5");
    expect(fixture.querySelectorAll("input")[1].getAttribute("style")).toBe("color: #787878;");
  });

  test("input is not filled with highlight when maximum ranges reached", async () => {
    const { model } = await createSelectionInput({ maximumRanges: 1 });
    expect(fixture.querySelectorAll("input")).toHaveLength(1);
    model.dispatch("PREPARE_SELECTION_EXPANSION");
    model.dispatch("START_SELECTION_EXPANSION");
    selectCell(model, "B2");
    await nextTick();
    expect(fixture.querySelectorAll("input")).toHaveLength(1);
    expect(fixture.querySelector("input")!.value).toBe("A1");
    expect(fixture.querySelector(".o-add-selection")).toBeNull();
  });

  test("new range is added when button clicked", async () => {
    await createSelectionInput();
    expect(fixture.querySelectorAll("input").length).toBe(1);
    await simulateClick(".o-add-selection");
    expect(fixture.querySelectorAll("input").length).toBe(2);
  });

  test("cannot add more ranges than the maximum", async () => {
    await createSelectionInput({ maximumRanges: 2 });
    expect(fixture.querySelectorAll("input").length).toBe(1);
    await simulateClick(".o-add-selection");
    expect(fixture.querySelectorAll("input").length).toBe(2);
    expect(fixture.querySelector(".o-add-selection")).toBeNull();
    await simulateClick(".o-remove-selection");
    expect(fixture.querySelector(".o-add-selection")).toBeDefined();
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

  test("changed event is triggered when highlight added", async () => {
    let newRanges;
    const onChanged = jest.fn(({ detail }) => {
      newRanges = detail.ranges;
    });
    const { model } = await createSelectionInput({ onChanged });
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: {
        B4: { quantity: 1, color: "#454545" },
      },
    });
    await nextTick();
    expect(onChanged).toHaveBeenCalled();
    expect(newRanges).toStrictEqual(["B4"]);
  });

  test("focus is transfered from one input to another", async () => {
    model = new Model();
    const parent = new MutliParent(model);
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
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: {
        B4: { quantity: 1, color: "#454545" },
      },
    });
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
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: {
        B4: { quantity: 1, color: "#454545" },
      },
    });
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
    expect(fixture.querySelectorAll("input")[0].getAttribute("style")).toBe("color: #0074d9;");
    await writeInput(0, "aaaaa");
    expect(fixture.querySelectorAll("input")[0].value).toBe("aaaaa");
    expect(fixture.querySelectorAll("input")[0].getAttribute("style")).toBe(
      "color: #000;border-color: red;"
    );
    await writeInput(0, "B1");
    expect(fixture.querySelectorAll("input")[0].value).toBe("B1");
    expect(fixture.querySelectorAll("input")[0].getAttribute("style")).toBe("color: #ad8e00;");
  });
  test("don't show red border initially", async () => {
    await createSelectionInput();
    expect(fixture.querySelectorAll("input")[0].getAttribute("style")).toBe("color: #000;");
  });
});
