import { App, Component, useSubEnv, xml } from "@odoo/owl";
import { Model } from "../../src";
import { OPEN_CF_SIDEPANEL_ACTION } from "../../src/actions/menu_items_actions";
import { SelectionInput } from "../../src/components/selection_input/selection_input";
import { ColorGenerator, toCartesian, toZone } from "../../src/helpers";
import { useStoreProvider } from "../../src/store_engine";
import { ModelStore } from "../../src/stores";
import { HighlightStore } from "../../src/stores/highlight_store";
import { Color, SpreadsheetChildEnv } from "../../src/types";
import {
  activateSheet,
  addCellToSelection,
  createSheet,
  createSheetWithName,
  merge,
  selectCell,
  undo,
} from "../test_helpers/commands_helpers";
import {
  clickCell,
  keyDown,
  keyUp,
  selectColumnByClicking,
  setInputValueAndTrigger,
  simulateClick,
} from "../test_helpers/dom_helper";
import {
  flattenHighlightRange,
  getChildFromComponent,
  mountComponent,
  mountSpreadsheet,
  nextTick,
} from "../test_helpers/helpers";

let model: Model;
let fixture: HTMLElement;

function focus(index = 0) {
  fixture.querySelectorAll("input")[index].focus();
}

async function writeInput(index: number, text: string) {
  focus(index);
  await nextTick();
  const input = fixture.querySelectorAll("input")[index];
  input.value = text;
  input.dispatchEvent(new Event("input"));
  await nextTick();
}

interface SelectionInputTestConfig {
  initialRanges?: string[];
  hasSingleRange?: boolean;
  onChanged?: jest.Mock<void, [any]>;
  onConfirmed?: jest.Mock<void, []>;
  colors?: Color[];
}

class Parent extends Component<any> {
  static template = xml/* xml */ `
    <SelectionInput
      ranges="initialRanges || []"
      hasSingleRange="hasSingleRange"
      onSelectionChanged="(ranges) => this.onChanged(ranges)"
      onSelectionConfirmed="onConfirmed"
      colors="colors || []"
    />
  `;
  static components = { SelectionInput };
  static props = { model: Object, config: Object };
  model!: Model;
  initialRanges: string[] | undefined;
  hasSingleRange: boolean | undefined;
  onChanged!: jest.Mock<void, [any]>;
  onConfirmed!: jest.Mock<void, []>;
  colors: Color[] | undefined;

  get id(): string {
    const selectionInput = getChildFromComponent(this, SelectionInput);
    return selectionInput["id"];
  }

  setup() {
    useSubEnv({
      model: this.props.model,
    });
    const stores = useStoreProvider();
    stores.inject(ModelStore, this.props.model);
    this.initialRanges = this.props.config.initialRanges;
    this.hasSingleRange = this.props.config.hasSingleRange;
    this.colors = this.props.config.colors;
    this.model = model;
    this.onChanged = this.props.config.onChanged || jest.fn();
    this.onConfirmed = this.props.config.onConfirmed || jest.fn();
  }
}

class MultiParent extends Component<any> {
  static template = xml/* xml */ `
    <div>
      <div class="input-1">
        <SelectionInput ranges="[]"/>
      </div>
      <div class="input-2">
        <SelectionInput ranges="[]"/>
      </div>
    </div>
  `;
  static components = { SelectionInput };
  static props = { model: Object };

  setup() {
    useSubEnv({
      model: this.props.model,
    });
    const stores = useStoreProvider();
    stores.inject(ModelStore, this.props.model);
  }
}

async function createSelectionInput(
  config: SelectionInputTestConfig = {},
  fixtureEl?: HTMLElement
) {
  model = new Model();
  let parent: Component;
  let app: App;
  ({ fixture, parent, app } = await mountComponent(Parent, {
    model,
    fixture: fixtureEl,
    props: { model, config },
  }));
  await nextTick();
  const id = (parent as Parent).id;
  return {
    parent: parent as Parent,
    env: parent.env as SpreadsheetChildEnv,
    model,
    id,
    app,
    fixture,
  };
}

describe("Selection Input", () => {
  test("empty input is not colored", async () => {
    await createSelectionInput();
    expect(fixture.querySelectorAll("input")[0].getAttribute("style")).toBe("");
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

  test("can remove an empty selection input", async () => {
    await createSelectionInput();
    await simulateClick(".o-add-selection");
    await simulateClick(".o-add-selection");
    expect(document.querySelectorAll(".o-selection-input input")).toHaveLength(3);
    const range1 = document.querySelectorAll(".o-selection-input input")[0];
    await setInputValueAndTrigger(range1, "A1:A4");
    const range2 = document.querySelectorAll(".o-selection-input input")[2];
    await setInputValueAndTrigger(range2, "C1:C4");
    // We have 3 selection inputs, the second one is empty
    const removeEmptyRangeQuery = document.querySelectorAll(".o-remove-selection")[1];
    await simulateClick(removeEmptyRangeQuery);
    expect(document.querySelectorAll(".o-selection-input input")).toHaveLength(2);
  });

  test("can remove a non-empty selection input", async () => {
    await createSelectionInput();
    await simulateClick(".o-add-selection");
    await simulateClick(".o-add-selection");
    expect(document.querySelectorAll(".o-selection-input input")).toHaveLength(3);
    const range1 = document.querySelectorAll(".o-selection-input input")[0];
    await setInputValueAndTrigger(range1, "A1:A4");
    const range2 = document.querySelectorAll(".o-selection-input input")[1];
    await setInputValueAndTrigger(range2, "B1:B4");
    const range3 = document.querySelectorAll(".o-selection-input input")[2];
    await setInputValueAndTrigger(range3, "C1:C4");

    const removeEmptyRangeQuery = document.querySelectorAll(".o-remove-selection")[1];
    await simulateClick(removeEmptyRangeQuery);
    expect(document.querySelectorAll(".o-selection-input input")).toHaveLength(2);
  });

  test("update with invalid input hide confirm button", async () => {
    await createSelectionInput();
    await simulateClick(fixture.querySelector("input")!);
    expect(fixture.querySelectorAll(".o-selection-ok").length).toBe(1);
    expect(fixture.querySelectorAll(".o-selection-ko").length).toBe(0);
    await setInputValueAndTrigger(fixture.querySelector("input")!, "A1");
    expect(fixture.querySelectorAll(".o-selection-ok").length).toBe(1);
    expect(fixture.querySelectorAll(".o-selection-ko").length).toBe(1);
    await simulateClick(".o-selection-ok");
    await nextTick();
    expect(fixture.querySelectorAll(".o-selection-ok").length).toBe(0);
    expect(fixture.querySelectorAll(".o-selection-ko").length).toBe(0);

    await simulateClick("input");
    await setInputValueAndTrigger(fixture.querySelector("input")!, "this is not valid");
    expect(fixture.querySelectorAll(".o-selection-ok[disabled]").length).toBe(1);
    expect(fixture.querySelectorAll(".o-selection-ko").length).toBe(1);
  });

  test("hitting enter key acts the same as clicking confirm button for valid dataset", async () => {
    let isConfirmed = false;
    const onConfirmed = jest.fn(() => {
      isConfirmed = true;
    });
    await createSelectionInput({ onConfirmed });
    expect(fixture.querySelector(".o-focused")).toBeTruthy();
    expect(isConfirmed).toBeFalsy();
    await keyDown({ key: "Enter" });
    expect(fixture.querySelector(".o-focused")).toBeFalsy();
    expect(onConfirmed).toHaveBeenCalled();
    expect(isConfirmed).toBeTruthy();
  });

  test("hitting enter key does nothing for an invalid dataset", async () => {
    const onConfirmed = jest.fn();
    await createSelectionInput({ onConfirmed });
    await writeInput(0, "Kaboom");
    expect(fixture.querySelector(".o-focused")).toBeTruthy();
    await keyDown({ key: "Enter" });
    expect(fixture.querySelector(".o-focused")).toBeTruthy();
    expect(onConfirmed).not.toHaveBeenCalled();
  });

  test("input is filled when new cells are selected", async () => {
    const { model } = await createSelectionInput();
    selectCell(model, "B4");
    await nextTick();
    expect(fixture.querySelector("input")!.value).toBe("B4");
    const colorGenerator = new ColorGenerator(2);
    const color = colorGenerator.next();
    expect(fixture.querySelector("input")!.getAttribute("style")).toBe(`color:${color}; `);
    simulateClick(".o-add-selection");
    selectCell(model, "B5");
    await nextTick();
    const color2 = colorGenerator.next();
    expect(fixture.querySelectorAll("input")[0].value).toBe("B4");
    expect(fixture.querySelectorAll("input")[0].getAttribute("style")).toBe(`color:${color}; `);
    expect(fixture.querySelectorAll("input")[1].value).toBe("B5");
    expect(fixture.querySelectorAll("input")[1].getAttribute("style")).toBe(`color:${color2}; `);
  });

  test("colors passed as props are taken into account and completed by a color", async () => {
    const { model } = await createSelectionInput({ colors: ["#FF0000"] });
    selectCell(model, "B4");
    await nextTick();
    expect(fixture.querySelector("input")!.value).toBe("B4");
    expect(fixture.querySelector("input")!.getAttribute("style")).toBe("color:#FF0000; ");
    simulateClick(".o-add-selection");
    selectCell(model, "B5");
    await nextTick();
    const colorGenerator = new ColorGenerator(2);
    colorGenerator.next(); //the first generated color is skipped in favor of the props color
    const secondColor = colorGenerator.next();
    expect(fixture.querySelectorAll("input")[0].value).toBe("B4");
    expect(fixture.querySelectorAll("input")[0].getAttribute("style")).toBe("color:#FF0000; ");
    expect(fixture.querySelectorAll("input")[1].value).toBe("B5");
    expect(fixture.querySelectorAll("input")[1].getAttribute("style")).toBe(
      `color:${secondColor}; `
    );
  });

  test("update of colors are taken into account", async () => {
    // This test aims to check if the colors are updated when the colors function is updated.
    // This kind of update can comes when removing a range from the selectionInput for the
    // data series of a chart, as the color of the removed range won't be passed anymore to
    // the colors function in the chart's side panel's props.
    const colors = ["#FF0000", "#00FF00"];
    const { parent, env } = await createSelectionInput({
      initialRanges: ["A1", "B1"],
      colors: colors,
    });
    const highlightStore = env.getStore(HighlightStore);
    await simulateClick(fixture.querySelectorAll("input")[0]);
    expect(fixture.querySelectorAll("input")[0].getAttribute("style")).toBe("color:#FF0000; ");
    expect(fixture.querySelectorAll("input")[1].getAttribute("style")).toBe("color:#00FF00; ");
    expect(highlightStore.highlights.map(flattenHighlightRange)).toMatchObject([
      { color: "#FF0000", zone: toZone("A1") },
      { color: "#00FF00", zone: toZone("B1") },
    ]);
    parent.colors = ["#0000FF", "#FF00FF"];
    await simulateClick(fixture.querySelectorAll("input")[1]);
    expect(fixture.querySelectorAll("input")[0].getAttribute("style")).toBe("color:#0000FF; ");
    expect(fixture.querySelectorAll("input")[1].getAttribute("style")).toBe("color:#FF00FF; ");
    expect(highlightStore.highlights.map(flattenHighlightRange)).toMatchObject([
      { color: "#0000FF", zone: toZone("A1") },
      { color: "#FF00FF", zone: toZone("B1") },
    ]);
  });

  test("can select full column as unbounded zone by clicking on header", async () => {
    const { model } = await createSelectionInput();
    model.selection.selectColumn(3, "overrideSelection");
    await nextTick();
    expect(fixture.querySelector("input")!.value).toBe("D:D");
  });

  test("can select full row as unbounded zone by clicking on header", async () => {
    const { model } = await createSelectionInput();
    model.selection.selectRow(2, "overrideSelection");
    await nextTick();
    expect(fixture.querySelector("input")!.value).toBe("3:3");
  });

  test("can correctly select a merged zone", async () => {
    const { model } = await createSelectionInput();
    merge(model, "A1:B2");
    model.selection.selectCell(0, 0);
    await nextTick();
    expect(fixture.querySelector("input")!.value).toBe("A1");
    model.selection.selectZone({
      cell: { col: 0, row: 0 },
      zone: { top: 0, left: 0, bottom: 1, right: 1 },
    });
    await nextTick();
    expect(fixture.querySelector("input")!.value).toBe("A1");
  });

  test("ctrl + select cell --> add new input", async () => {
    const { env, model, fixture } = await mountSpreadsheet();
    OPEN_CF_SIDEPANEL_ACTION(env);
    await nextTick();
    const input = fixture.querySelector(".o-selection-input input") as HTMLInputElement;
    await simulateClick(input);
    clickCell(model, "B4");
    await nextTick();
    clickCell(model, "B5", { ctrlKey: true });
    await nextTick();
    const inputs = fixture.querySelectorAll(
      ".o-selection-input input"
    ) as unknown as HTMLInputElement[];
    expect(inputs.length).toBe(2);
    expect(inputs[0].value).toBe("B4");
    expect(inputs[1].value).toBe("B5");
  });

  test("input is not filled with highlight when maximum ranges reached", async () => {
    const { model } = await createSelectionInput({ hasSingleRange: true });
    expect(fixture.querySelectorAll("input")).toHaveLength(1);
    addCellToSelection(model, "B2");
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
    expect(fixture.querySelectorAll("input")[0].classList).not.toContain("o-focused");
    expect(fixture.querySelectorAll("input")[1].classList).toContain("o-focused");
    await simulateClick("input"); // focus the first input
    expect(fixture.querySelectorAll("input")[0].classList).toContain("o-focused");
    expect(fixture.querySelectorAll("input")[1].classList).not.toContain("o-focused");
  });

  test("can unfocus all inputs with the OK button", async () => {
    await createSelectionInput();
    expect(fixture.querySelector(".o-focused")).toBeTruthy();
    await simulateClick(".o-selection-ok");
    expect(fixture.querySelector(".o-focused")).toBeFalsy();
  });

  test("manually input a single cell", async () => {
    await createSelectionInput();
    await writeInput(0, "C2");
    expect(fixture.querySelectorAll("input")[0].value).toBe("C2");
  });

  test("manually input multiple cells", async () => {
    await createSelectionInput();
    await writeInput(0, "C2,A1");
    expect(fixture.querySelectorAll("input")[0].value).toBe("C2");
    expect(fixture.querySelectorAll("input")[1].value).toBe("A1");
  });

  test("manually add another range via trailing comma", async () => {
    await createSelectionInput({ initialRanges: ["C2"] });
    await writeInput(0, "C2,");
    expect(fixture.querySelectorAll("input")[0].value).toBe("C2");
    expect(fixture.querySelectorAll("input")[1].value).toBe("");
  });

  test.each([
    [",", ""],
    [",C1", "C1"],
  ])(
    "leading comma will not split the input into multiple ranges",
    async (inputString, rangeValue) => {
      await createSelectionInput();
      await writeInput(0, inputString);
      expect(fixture.querySelectorAll("input").length).toEqual(1);
      expect(fixture.querySelectorAll("input")[0].value).toBe(rangeValue);
    }
  );

  test("F2 alters edition mode", async () => {
    await createSelectionInput({ initialRanges: ["C2"] });
    const selectionInputEl: HTMLInputElement = fixture.querySelector(".o-selection-input input")!;
    focus(0);
    await nextTick();
    expect(document.activeElement).toBe(selectionInputEl);
    await keyDown({ key: "ArrowLeft" });
    expect(document.activeElement).toBe(selectionInputEl);
    expect(selectionInputEl?.value).toEqual("B2");
    keyDown({ key: "F2" });
    await keyDown({ key: "ArrowLeft" });
    expect(document.activeElement).toBe(selectionInputEl);
    expect(selectionInputEl?.value).toEqual("B2");
  });

  test("changed event is triggered when input changed", async () => {
    let newRanges;
    const onChanged = jest.fn((ranges) => {
      newRanges = ranges;
    });
    await createSelectionInput({ onChanged });
    await writeInput(0, "C2");
    expect(onChanged).toHaveBeenCalled();
    expect(newRanges).toStrictEqual(["C2"]);
  });

  test("changed event is triggered when cell is selected", async () => {
    let newRanges;
    const onChanged = jest.fn((ranges) => {
      newRanges = ranges;
    });
    const { model } = await createSelectionInput({ onChanged });
    selectCell(model, "B4");
    await nextTick();
    expect(onChanged).toHaveBeenCalled();
    expect(newRanges).toStrictEqual(["B4"]);
  });

  test("can select full col/row grid selection as selection input data series range", async () => {
    const { env, model, fixture } = await mountSpreadsheet();
    await selectColumnByClicking(model, "B");
    OPEN_CF_SIDEPANEL_ACTION(env);
    await nextTick();
    let input = fixture.querySelector(".o-selection-input input") as HTMLInputElement;
    expect(input.value).toBe("B:B");

    await simulateClick(input);
    await selectColumnByClicking(model, "C");
    input = fixture.querySelector(".o-selection-input input") as HTMLInputElement;
    expect(input.value).toBe("C:C");

    await selectColumnByClicking(model, "B");
    input = fixture.querySelector(".o-selection-input input") as HTMLInputElement;
    expect(input.value).toBe("B:B");
  });

  test("focus is transferred from one input to another", async () => {
    model = new Model();
    ({ fixture } = await mountComponent(MultiParent, { props: { model }, model }));
    await nextTick();
    expect(fixture.querySelector(".input-1 .o-focused")).toBeFalsy();
    expect(fixture.querySelector(".input-2 .o-focused")).toBeTruthy();
    await simulateClick(".input-1 input");
    expect(fixture.querySelector(".input-1 .o-focused")).toBeTruthy();
    expect(fixture.querySelector(".input-2 .o-focused")).toBeFalsy();
  });

  test("focus is transferred into the newly added input automatically when typing comma at the end", async () => {
    await createSelectionInput({ initialRanges: ["C2"] });
    await simulateClick("input");
    expect(fixture.querySelectorAll("input")[0].classList).toContain("o-focused");
    await writeInput(0, "C2,");
    expect(fixture.querySelectorAll("input")[0].classList).not.toContain("o-focused");
    expect(fixture.querySelectorAll("input")[1].classList).toContain("o-focused");
    expect(document.activeElement).toBe(fixture.querySelectorAll("input")[1]);
  });

  test("go back to initial sheet when selection is finished", async () => {
    const { model, fixture } = await createSelectionInput();
    const sheet1Id = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42", activate: true });
    await createSelectionInput({}, fixture);
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
    expect(fixture.querySelectorAll("input")[0].getAttribute("style")).not.toBe("");
    expect(fixture.querySelectorAll("input")[0].classList).not.toContain("o-invalid");
    await writeInput(0, "aaaaa");
    expect(fixture.querySelectorAll("input")[0].value).toBe("aaaaa");
    expect(fixture.querySelectorAll("input")[0].getAttribute("style")).toBe("");
    expect(fixture.querySelectorAll("input")[0].classList).toContain("o-invalid");
    await writeInput(0, "B1");
    expect(fixture.querySelectorAll("input")[0].value).toBe("B1");
    expect(fixture.querySelectorAll("input")[0].getAttribute("style")).not.toBe("");
    expect(fixture.querySelectorAll("input")[0].classList).not.toContain("o-invalid");
  });
  test("don't show red border initially", async () => {
    await createSelectionInput();
    expect(fixture.querySelectorAll("input")[0].classList).not.toContain("o-invalid");
  });

  test("pressing and releasing control has no effect on future clicks", async () => {
    const { env, model, fixture } = await mountSpreadsheet();
    OPEN_CF_SIDEPANEL_ACTION(env);
    await nextTick();
    let input = fixture.querySelector(".o-selection-input input") as HTMLInputElement;
    await simulateClick(input);
    expect(input.value).toBe("A1");
    await keyDown({ key: "Control" });
    await keyUp({ key: "Control" });
    await clickCell(model, "A2");
    expect(fixture.querySelectorAll(".o-selection-input input")).toHaveLength(1);
    input = fixture.querySelector(".o-selection-input input") as HTMLInputElement;
    expect(input.value).toBe("A2");
  });

  test("In 'isSingleRange' mode, capture the first part of a multi range input", async () => {
    await createSelectionInput({ hasSingleRange: true });
    await writeInput(0, "C2,A1");
    expect(fixture.querySelector("input")?.value).toBe("C2");
  });

  describe("change highlight position in the grid", () => {
    test("change the associated range in the composer ", async () => {
      const { model, fixture } = await createSelectionInput({ initialRanges: ["B2"] });
      focus(0);
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B2"),
      });
      model.selection.selectZone(
        { cell: toCartesian("C3"), zone: toZone("C3") },
        { unbounded: true }
      );
      await nextTick();
      expect(fixture.querySelectorAll("input")[0].value).toBe("C3");
    });
    test("highlights change handle unbounded ranges ", async () => {
      const { model, fixture } = await createSelectionInput({ initialRanges: ["B2"] });
      focus(0);
      await nextTick();
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B1:B100"),
      });
      model.selection.selectZone(
        { cell: toCartesian("C1"), zone: toZone("C1:C100") },
        { unbounded: true }
      );
      await nextTick();
      expect(fixture.querySelectorAll("input")[0].value).toBe("C:C");
    });
    test("change the first associated range in the composer when ranges are the same", async () => {
      const { model, fixture } = await createSelectionInput({ initialRanges: ["B2", "B2"] });
      focus(0);
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B2"),
      });
      model.selection.selectZone(
        { cell: toCartesian("C3"), zone: toZone("C3") },
        { unbounded: true }
      );
      await nextTick();
      const inputs = fixture.querySelectorAll("input");
      expect(inputs[0].value).toBe("C3");
      expect(inputs[1].value).toBe("B2");
    });

    test("the first range doesn't change if other highlight transit by the first range state ", async () => {
      const { model, fixture } = await createSelectionInput({ initialRanges: ["B2", "B1"] });
      focus(0);
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B1"),
      });
      model.selection.selectZone(
        { cell: toCartesian("B2"), zone: toZone("B2") },
        { unbounded: true }
      );
      model.selection.selectZone(
        { cell: toCartesian("B3"), zone: toZone("B3") },
        { unbounded: true }
      );

      await nextTick();
      const inputs = fixture.querySelectorAll("input");
      expect(inputs[0].value).toBe("B2");
      expect(inputs[1].value).toBe("B3");
    });

    test("can change references of different length", async () => {
      const { model, fixture } = await createSelectionInput({ initialRanges: ["B1"] });
      focus(0);
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B1"),
      });
      model.selection.selectZone(
        { cell: toCartesian("B1"), zone: toZone("B1:B2") },
        { unbounded: true }
      );
      await nextTick();
      expect(fixture.querySelectorAll("input")[0].value).toBe("B1:B2");
    });

    test("can change references with sheetname", async () => {
      const { model, fixture } = await createSelectionInput({ initialRanges: ["Sheet42!B1"] });
      createSheetWithName(model, { sheetId: "42", activate: true }, "Sheet42");
      await nextTick();
      focus(0);
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B1"),
      });
      model.selection.selectZone(
        { cell: toCartesian("B2"), zone: toZone("B2") },
        { unbounded: true }
      );
      await nextTick();
      expect(fixture.querySelectorAll("input")[0].value).toBe("Sheet42!B2");
    });

    test("change references of the current sheet", async () => {
      const { model, fixture } = await createSelectionInput({
        initialRanges: ["B1", "Sheet42!B1"],
      });
      createSheetWithName(model, { sheetId: "42", activate: true }, "Sheet42");
      await nextTick();
      focus(0);
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B1"),
      });
      model.selection.selectZone(
        { cell: toCartesian("B2"), zone: toZone("B2") },
        { unbounded: true }
      );
      await nextTick();
      const inputs = fixture.querySelectorAll("input");
      expect(inputs[0].value).toBe("B1");
      expect(inputs[1].value).toBe("Sheet42!B2");
    });

    test.each([
      ["b$1", "C$1"],
      ["$b1", "$C1"],
    ])("can change cells reference with index fixed", async (ref, resultRef) => {
      const { model, fixture } = await createSelectionInput({ initialRanges: [ref] });
      focus(0);
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B1"),
      });
      model.selection.selectZone(
        { cell: toCartesian("C1"), zone: toZone("C1") },
        { unbounded: true }
      );
      await nextTick();
      expect(fixture.querySelectorAll("input")[0].value).toBe(resultRef);
    });

    test.each([
      ["B1:B$2", "C1:C$2"],
      ["B1:$B$2", "C1:$C$2"],
      ["B1:$B2", "C1:$C2"],
      ["$B1:B2", "$C1:C2"],
      ["$B$1:B2", "$C$1:C2"],
      ["B$1:B2", "C$1:C2"],
      ["$B1:$B2", "$C1:$C2"],
      ["B$1:B$2", "C$1:C$2"],
      ["$B$1:$B$2", "$C$1:$C$2"],
    ])("can change ranges reference with index fixed", async (ref, resultRef) => {
      const { model, fixture } = await createSelectionInput({ initialRanges: [ref] });
      focus(0);
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B1:B2"),
      });
      model.selection.selectZone(
        { cell: toCartesian("C1"), zone: toZone("C1:C2") },
        { unbounded: true }
      );
      await nextTick();
      expect(fixture.querySelectorAll("input")[0].value).toBe(resultRef);
    });

    test("can change cells merged reference", async () => {
      const { model, fixture } = await createSelectionInput({ initialRanges: ["B1"] });
      merge(model, "B1:B2");
      await nextTick();
      focus(0);
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B1:B2"),
      });
      model.selection.selectZone(
        { cell: toCartesian("C1"), zone: toZone("C1") },
        { unbounded: true }
      );
      await nextTick();
      expect(fixture.querySelectorAll("input")[0].value).toBe("C1");

      await simulateClick(".o-add-selection");
      await writeInput(1, "B2");

      model.dispatch("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B1:B2"),
      });
      model.selection.selectZone(
        { cell: toCartesian("C2"), zone: toZone("C2") },
        { unbounded: true }
      );
      await nextTick();
      const inputs = fixture.querySelectorAll("input");
      expect(inputs[0].value).toBe("C1");
      expect(inputs[1].value).toBe("C2");
    });

    test("can change cells merged reference with index fixed", async () => {
      const { model, fixture } = await createSelectionInput({ initialRanges: ["B$2"] });
      merge(model, "B1:B2");
      await nextTick();
      focus(0);
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B1:B2"),
      });
      model.selection.selectZone(
        { cell: toCartesian("C1"), zone: toZone("C1:C2") },
        { unbounded: true }
      );
      await nextTick();
      expect(fixture.querySelectorAll("input")[0].value).toBe("C$1:C$2");
    });

    test("references are expanded to include merges", async () => {
      const { model, fixture } = await createSelectionInput({ initialRanges: ["A1:B1"] });
      merge(model, "C1:D1");
      await nextTick();
      focus(0);

      model.dispatch("START_CHANGE_HIGHLIGHT", {
        zone: toZone("A1:B1"),
      });
      model.selection.selectZone(
        { cell: toCartesian("B1"), zone: toZone("B1:C1") },
        { unbounded: true }
      );
      await nextTick();
      expect(fixture.querySelectorAll("input")[0].value).toBe("B1:D1");
    });

    test("can change references of different length with index fixed", async () => {
      const { model, fixture } = await createSelectionInput({ initialRanges: ["$B$1"] });
      focus(0);
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B1"),
      });
      model.selection.selectZone(
        { cell: toCartesian("B1"), zone: toZone("B1:B2") },
        { unbounded: true }
      );
      await nextTick();
      expect(fixture.querySelectorAll("input")[0].value).toBe("$B$1:$B$2");
    });
  });

  test("After confirming an empty selection input, the confirm button should become visible.", async () => {
    await createSelectionInput();

    await simulateClick(fixture.querySelector("input")!);
    await simulateClick(fixture.querySelector(".o-selection-ok"));
    await nextTick();
    expect(fixture.querySelectorAll(".o-selection-ok").length).toBe(0);

    await simulateClick(fixture.querySelector("input")!);
    await nextTick();
    expect(fixture.querySelectorAll(".o-selection-ok").length).toBe(1);
  });

  test("After confirming two empty selection inputs, the confirm button should become visible.", async () => {
    await createSelectionInput();
    await simulateClick(fixture.querySelector("input")!);
    await simulateClick(".o-add-selection");
    await simulateClick(fixture.querySelector(".o-selection-ok"));
    await nextTick();
    expect(fixture.querySelectorAll(".o-selection-ok").length).toBe(0);

    await simulateClick(fixture.querySelector("input")!);
    await nextTick();
    expect(fixture.querySelectorAll(".o-selection-ok").length).toBe(1);
  });

  test("Reset selection button reset the selection input and remove focus", async () => {
    const { model } = await createSelectionInput({ initialRanges: ["C4", "A1"] });
    const input = fixture.querySelector("input")!;
    await simulateClick(input);
    setInputValueAndTrigger(input, "C5:D9");
    await nextTick();
    expect(input.value).toBe("C5:D9");

    await simulateClick(".o-selection-ko");
    expect(input.value).toBe("C4");

    expect(model.getters.isGridSelectionActive()).toBeTruthy();
  });
});
