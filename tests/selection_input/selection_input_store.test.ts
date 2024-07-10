import { CellComposerStore } from "../../src/components/composer/composer/cell_composer_store";
import { SelectionInputStore } from "../../src/components/selection_input/selection_input_store";
import { toZone, zoneToXc } from "../../src/helpers";
import { DependencyContainer } from "../../src/store_engine";
import { HighlightStore } from "../../src/stores/highlight_store";
import {
  activateSheet,
  addCellToSelection,
  copy,
  createSheet,
  createSheetWithName,
  merge,
  moveAnchorCell,
  paste,
  resizeAnchorZone,
  selectCell,
  setAnchorCorner,
  setCellContent,
  setSelection,
} from "../test_helpers/commands_helpers";
import { makeStore } from "../test_helpers/stores";

/** returns the highlighted zone by the selection input component */
function highlightedZones(container: DependencyContainer) {
  return container
    .get(HighlightStore)
    .highlights.map((h) => h.zone)
    .map(zoneToXc);
}

function idOfRange(store: SelectionInputStore, rangeIndex: number): number {
  return store.selectionInputs[rangeIndex].id;
}

describe("selection input plugin", () => {
  test("empty input should focus the first range", () => {
    const { store } = makeStore(SelectionInputStore);
    expect(store.selectionInputs.length).toBe(1);
    expect(store.selectionInputs[0].xc).toBe("");
    expect(store.selectionInputs[0].isFocused).toBe(true);
  });

  test("input with inital ranges should not be focused", () => {
    const { store, container } = makeStore(SelectionInputStore, ["D4"]);
    expect(store.selectionInputs.length).toBe(1);
    expect(store.selectionInputs[0].xc).toBe("D4");
    expect(store.selectionInputs[0].isFocused).toBeFalsy();
    expect(highlightedZones(container)).toStrictEqual([]);
  });

  test("multiple initial values have different ids", () => {
    const { store } = makeStore(SelectionInputStore, ["D4", "D5"]);
    const [range1, range2] = store.selectionInputs;
    expect(range1.id).not.toBe(range2.id);
  });

  test("focused input should change with selection", () => {
    const { store, model, container } = makeStore(SelectionInputStore);
    store.focusById(idOfRange(store, 0));
    selectCell(model, "C2");
    expect(store.selectionInputs[0].xc).toBe("C2");
    const firstColor = store.selectionInputs[0].color;
    expect(highlightedZones(container)).toStrictEqual(["C2"]);
    selectCell(model, "D4");
    const secondColor = store.selectionInputs[0].color;
    expect(store.selectionInputs[0].xc).toBe("D4");
    expect(highlightedZones(container)).toStrictEqual(["D4"]);
    expect(firstColor).toBe(secondColor);
  });

  test("select cell inside a merge expands the selection", () => {
    const { store, model, container } = makeStore(SelectionInputStore);
    merge(model, "A2:A4");
    store.focusById(idOfRange(store, 0));
    setSelection(model, ["A3:A5"]);
    expect(store.selectionInputs[0].xc).toBe("A2:A5");
    expect(highlightedZones(container)).toStrictEqual(["A2:A5"]);
  });

  test("select cell inside a merge expands the selection of a single range input", () => {
    const { store, model, container } = makeStore(SelectionInputStore, [], true);
    selectCell(model, "B1");
    merge(model, "A2:A4");
    store.focusById(idOfRange(store, 0));
    addCellToSelection(model, "A4");
    setAnchorCorner(model, "A3");
    expect(store.selectionInputs[0].xc).toBe("A2");
    expect(highlightedZones(container)).toStrictEqual(["A2:A4"]);
    setAnchorCorner(model, "A2");
    expect(store.selectionInputs[0].xc).toBe("A2");
    expect(highlightedZones(container)).toStrictEqual(["A2:A4"]);
  });

  test("focus input which is already focused", () => {
    const { store } = makeStore(SelectionInputStore);
    store.focusById(idOfRange(store, 0));
    expect(store.selectionInputs[0].isFocused).toBe(true);
    store.focusById(idOfRange(store, 0));
    expect(store.selectionInputs[0].isFocused).toBe(true);
  });

  test("focused input should not change when selecting a zone for composer", () => {
    const { store, model, container } = makeStore(SelectionInputStore);
    const composerStore = container.get(CellComposerStore);
    store.focusById(idOfRange(store, 0));
    composerStore.startEdition("=");
    selectCell(model, "C2");
    expect(store.selectionInputs[0].xc).toBe("");
  });

  test("expanding a selection fills empty input then adds a new input", () => {
    const { store, model, container } = makeStore(SelectionInputStore);
    store.focusById(idOfRange(store, 0));
    selectCell(model, "C2");
    expect(store.selectionInputs.length).toBe(1);
    expect(store.selectionInputs.map((i) => i.xc)).toEqual(["C2"]);
    expect(highlightedZones(container)).toStrictEqual(["C2"]);
    addCellToSelection(model, "D2");
    expect(store.selectionInputs.length).toBe(2);
    expect(store.selectionInputs.map((i) => i.xc)).toEqual(["C2", "D2"]);
    expect(highlightedZones(container)).toStrictEqual(["C2", "D2"]);
    const [firstColor, secondColor] = store.selectionInputs.map((i) => i.color);
    expect(firstColor).not.toBe(secondColor);
  });

  test("expanding a selection focuses the last range", () => {
    const { store, model } = makeStore(SelectionInputStore);
    store.focusById(idOfRange(store, 0));
    selectCell(model, "C2");
    addCellToSelection(model, "D2");
    expect(store.selectionInputs[1].isFocused).toBe(true);
  });

  test("expanding a selection does not add input if maximum is reached", () => {
    const { store, model } = makeStore(SelectionInputStore, [], true);
    selectCell(model, "C2");
    addCellToSelection(model, "D2");
    expect(store.selectionInputs).toHaveLength(1);
    expect(store.selectionInputs[0].xc).toBe("D2");
  });

  test("cannot add empty range when maximum ranges reached", () => {
    const { store } = makeStore(SelectionInputStore, [], true);
    expect(store.selectionInputs).toHaveLength(1);
    store.addEmptyRange();
    expect(store.selectionInputs).toHaveLength(1);
  });

  test("Cannot add multiple ranges to a 'singleRange' input", () => {
    const { store } = makeStore(SelectionInputStore, [], true);
    expect(store.selectionInputs).toHaveLength(1);
    expect(store.selectionInputValues).toEqual([]);
    store.changeRange(idOfRange(store, 0), "A3,A1");
    store.changeRange(idOfRange(store, 0), "A3,");
    expect(store.selectionInputValues).toEqual([]);
  });

  test("cannot add new range when maximum ranges reached", () => {
    const { store } = makeStore(SelectionInputStore, [], true);
    expect(store.selectionInputs).toHaveLength(1);
    store.changeRange(idOfRange(store, 0), "A3, A2");
    expect(store.selectionInputs).toHaveLength(1);
  });

  test("add an empty range", () => {
    const { store } = makeStore(SelectionInputStore);
    expect(store.selectionInputs.length).toBe(1);
    store.addEmptyRange();
    expect(store.selectionInputs.length).toBe(2);
    expect(store.selectionInputs[1].isFocused).toBe(true);
    expect(store.selectionInputs[1].xc).toBe("");
  });

  test("add an empty range with initial value", () => {
    const { store } = makeStore(SelectionInputStore, ["A5"]);
    expect(store.selectionInputs.length).toBe(1);
    store.addEmptyRange();
    expect(store.selectionInputs.length).toBe(2);
    expect(store.selectionInputs[1].isFocused).toBe(true);
    expect(store.selectionInputs[1].xc).toBe("");
  });

  test("remove a range", () => {
    const { store } = makeStore(SelectionInputStore);
    store.addEmptyRange();
    const ids = store.selectionInputs.map((i) => i.id);
    expect(store.selectionInputs.length).toBe(2);
    store.removeRange(idOfRange(store, 0));
    expect(store.selectionInputs.length).toBe(1);
    expect(store.selectionInputs.map((i) => i.id)).toEqual([ids[1]]);
  });

  test("last range is focused when one is removed", () => {
    const { store } = makeStore(SelectionInputStore);
    store.addEmptyRange();
    store.addEmptyRange();
    store.addEmptyRange();
    expect(store.selectionInputs.length).toBe(4);
    store.removeRange(idOfRange(store, 0));
    expect(store.selectionInputs.length).toBe(3);
    expect(store.selectionInputs[2].isFocused).toBe(true);
  });

  test("ranges are unfocused", () => {
    const { store } = makeStore(SelectionInputStore);
    expect(store.selectionInputs[0].isFocused).toBe(true);
    store.unfocus();
    expect(store.selectionInputs[0].isFocused).toBeFalsy();
  });

  test("same range is updated while selecting", () => {
    const { store, model } = makeStore(SelectionInputStore);
    selectCell(model, "C2");
    expect(store.selectionInputs[0].xc).toBe("C2");
    selectCell(model, "D2");
    expect(store.selectionInputs[0].xc).toBe("D2");
  });

  test("same range is updated while expanding", () => {
    const { store, model } = makeStore(SelectionInputStore, ["A1"]);
    store.addEmptyRange();

    addCellToSelection(model, "C2");
    expect(store.selectionInputs[1].xc).toBe("C2");
    setAnchorCorner(model, "D2");
    expect(store.selectionInputs[1].xc).toBe("C2:D2");
  });

  test("same color while selecting", () => {
    const { store, model } = makeStore(SelectionInputStore);
    selectCell(model, "C2");
    const color = store.selectionInputs[0].color;
    expect(color).toBeTruthy();
    selectCell(model, "D2");
    expect(store.selectionInputs[0].color).toBe(color);
  });

  test("same color with new selection in same range", () => {
    const { store, model } = makeStore(SelectionInputStore);
    selectCell(model, "C2");
    const color = store.selectionInputs[0].color;
    selectCell(model, "D2");
    expect(store.selectionInputs[0].color).toBe(color);
  });

  test("color changes when expanding selection", () => {
    const { store, model } = makeStore(SelectionInputStore);
    selectCell(model, "C2");
    const color = store.selectionInputs[0].color;
    addCellToSelection(model, "D2");
    expect(store.selectionInputs[1].color).not.toEqual(color);
  });

  test("color changes in new input", () => {
    const { store, model } = makeStore(SelectionInputStore);
    selectCell(model, "C2");
    const color = store.selectionInputs[0].color;
    store.addEmptyRange();
    selectCell(model, "C2");
    expect(store.selectionInputs[1].color).not.toBe(color);
  });

  test("focus does not change values", () => {
    const { store } = makeStore(SelectionInputStore, ["A1", "B2"]);
    expect(store.selectionInputs[0].xc).toBe("A1");
    expect(store.selectionInputs[1].xc).toBe("B2");
    expect(store.selectionInputs[0].isFocused).toBe(false);
    expect(store.selectionInputs[1].isFocused).toBe(false);
    store.focusById(idOfRange(store, 0));
    expect(store.selectionInputs[0].xc).toBe("A1");
    expect(store.selectionInputs[1].xc).toBe("B2");
    expect(store.selectionInputs[0].isFocused).toBe(true);
    expect(store.selectionInputs[1].isFocused).toBe(false);
  });

  test("manually changing the input updates highlighted zone", () => {
    const { store, container } = makeStore(SelectionInputStore);
    store.changeRange(idOfRange(store, 0), "C5");
    expect(store.selectionInputs[0].xc).toBe("C5");
    expect(highlightedZones(container)).toStrictEqual(["C5"]);
  });

  test("selection input updates handle full column ranges", () => {
    const { store, container } = makeStore(SelectionInputStore);
    store.changeRange(idOfRange(store, 0), "A3:A");
    expect(store.selectionInputs[0].xc).toBe("A3:A");
    expect(highlightedZones(container)).toEqual(["A3:A100"]);
  });

  test("selection input updates handle full row ranges", () => {
    const { store, container } = makeStore(SelectionInputStore);
    store.changeRange(idOfRange(store, 0), "F3:3");
    expect(store.selectionInputs[0].xc).toBe("F3:3");
    expect(highlightedZones(container)).toEqual(["F3:Z3"]);
  });

  test("manually changing the input with existing range", () => {
    const { store, container } = makeStore(SelectionInputStore, ["A8"]);
    store.changeRange(idOfRange(store, 0), "A8, C5");
    expect(store.selectionInputs[0].xc).toBe("A8");
    expect(store.selectionInputs[1].xc).toBe("C5");
    expect(store.selectionInputs[1].isFocused).toBe(true);
    expect(highlightedZones(container)).toStrictEqual(["A8", "C5"]);
  });

  test("setting multiple ranges in one input", () => {
    const { store, container } = makeStore(SelectionInputStore);
    store.changeRange(idOfRange(store, 0), "C5, D8, B2");
    const [range1, range2, range3] = store.selectionInputs;
    expect(range1.xc).toBe("C5");
    expect(range2.xc).toBe("D8");
    expect(range3.xc).toBe("B2");
    expect(range1.id).not.toBe(range2.id);
    expect(range2.id).not.toBe(range3.id);
    expect(highlightedZones(container)).toStrictEqual(["C5", "D8", "B2"]);
    const [firstColor, secondColor, thirdColor] = store.highlights.map((h) => h.color);
    expect(firstColor).not.toBe(secondColor);
    expect(thirdColor).not.toBe(secondColor);
  });

  test("writing an invalid range does not crash", () => {
    const { store, container } = makeStore(SelectionInputStore);
    store.changeRange(idOfRange(store, 0), "This is invalid");
    expect(store.selectionInputValues).toEqual(["This is invalid"]);
    expect(highlightedZones(container)).toStrictEqual([]);
  });

  test("writing an invalid range with valid ones keeps the invalid one", () => {
    const { store, container } = makeStore(SelectionInputStore, ["B2", "E3"]);
    store.focusById(idOfRange(store, 0));
    store.changeRange(idOfRange(store, 0), "A1, This is invalid");
    expect(highlightedZones(container)).toEqual(["A1", "E3"]);
    expect(store.selectionInputs).toHaveLength(3);
    expect(store.selectionInputs[0].xc).toBe("A1");
    expect(store.selectionInputs[1].xc).toBe("This is invalid");
    expect(store.selectionInputs[2].xc).toBe("E3");
    expect(store.selectionInputValues).toEqual(["A1", "This is invalid", "E3"]);
  });

  test("writing an empty range removes the highlight", () => {
    const { store, container } = makeStore(SelectionInputStore);
    store.changeRange(idOfRange(store, 0), "C2");
    expect(highlightedZones(container)).toStrictEqual(["C2"]);
    store.changeRange(idOfRange(store, 0), "");
    expect(highlightedZones(container)).toStrictEqual([]);
  });

  test("disable input removes highlighted zones", () => {
    const { store, container } = makeStore(SelectionInputStore);
    store.changeRange(idOfRange(store, 0), "C2");
    expect(highlightedZones(container)).toStrictEqual(["C2"]);
    store.unfocus();
    expect(highlightedZones(container)).toStrictEqual([]);
  });

  test("initial ranges are not highlighted", () => {
    const { store } = makeStore(SelectionInputStore, ["C2", "D4"]);
    expect(store.selectionInputs.length).toBe(2);
    expect(store.highlights.length).toBe(0);
  });

  test("ranges are split for value", () => {
    const { store } = makeStore(SelectionInputStore);
    store.changeRange(idOfRange(store, 0), "C2, D5");
    expect(store.selectionInputValues).toStrictEqual(["C2", "D5"]);
  });

  test("multiple ranges are combined", () => {
    const { store } = makeStore(SelectionInputStore);
    store.addEmptyRange();
    store.changeRange(idOfRange(store, 0), "C2");
    store.changeRange(idOfRange(store, 1), "C6");
    expect(store.selectionInputValues).toStrictEqual(["C2", "C6"]);
  });

  test("trailing commas and spaces are removed", () => {
    const { store } = makeStore(SelectionInputStore);
    store.changeRange(idOfRange(store, 0), "C2, ");
    expect(store.selectionInputValues).toStrictEqual(["C2"]);
  });

  test("leading commas and spaces are removed", () => {
    const { store } = makeStore(SelectionInputStore);
    store.changeRange(idOfRange(store, 0), " ,C2,B3");
    expect(store.selectionInputValues).toStrictEqual(["C2", "B3"]);
  });

  test("selection expansion adds as many input as needed", () => {
    const { store, model, container } = makeStore(SelectionInputStore, ["C4"]);
    selectCell(model, "C2");
    store.focusById(idOfRange(store, 0));
    expect(highlightedZones(container)).toEqual(["C4"]);
    addCellToSelection(model, "D2");
    expect(highlightedZones(container)).toEqual(["C4", "D2"]);
    expect(store.selectionInputs[0].xc).toBe("C4");
    expect(store.selectionInputs[1].xc).toBe("D2");
  });

  test("multiple alter selection in a single range component", () => {
    const { store, model, container } = makeStore(SelectionInputStore, ["C4"], true);
    selectCell(model, "C2");
    store.focusById(idOfRange(store, 0));
    addCellToSelection(model, "E1");
    setAnchorCorner(model, "E2");
    setAnchorCorner(model, "E3");
    expect(highlightedZones(container)).toEqual(["E1:E3"]);
    expect(store.selectionInputs[0].xc).toBe("E1:E3");
  });

  test("selection expansion by altering selection adds inputs", () => {
    const { store, model, container } = makeStore(SelectionInputStore, ["D4"]);
    selectCell(model, "C2");
    store.focusById(idOfRange(store, 0));
    addCellToSelection(model, "D2");
    expect(highlightedZones(container)).toEqual(["D4", "D2"]);
    resizeAnchorZone(model, "right");
    expect(highlightedZones(container)).toEqual(["D4", "D2:E2"]);
    expect(store.selectionInputs[0].xc).toBe("D4");
    expect(store.selectionInputs[1].xc).toBe("D2:E2");
  });

  test("Selections are not shared between selection inputs", () => {
    const { store, model, container } = makeStore(SelectionInputStore, ["D4"]);
    selectCell(model, "C2");
    store.focusById(idOfRange(store, 0));
    addCellToSelection(model, "D2");
    expect(highlightedZones(container)).toEqual(["D4", "D2"]);
    resizeAnchorZone(model, "right");
    expect(highlightedZones(container)).toEqual(["D4", "D2:E2"]);
    expect(store.selectionInputs[0].xc).toBe("D4");
    expect(store.selectionInputs[1].xc).toBe("D2:E2");
  });

  test("highlights are updated when focus switched from one input to another", () => {
    const { store: store1, container } = makeStore(SelectionInputStore, ["D4"]);
    const store2 = container.instantiate(SelectionInputStore, ["D5"]);
    store1.focusById(idOfRange(store1, 0));
    expect(store1.selectionInputs[0].isFocused).toBe(true);
    expect(store2.selectionInputs[0].isFocused).toBe(false);
    expect(store1.selectionInputs[0].color).toBeTruthy();
    expect(store2.selectionInputs[0].color).toBeFalsy();
    expect(highlightedZones(container)).toEqual(["D4"]);
    store2.focusById(idOfRange(store2, 0));
    expect(store1.selectionInputs[0].isFocused).toBe(false);
    expect(store2.selectionInputs[0].isFocused).toBe(true);
    expect(store1.selectionInputs[0].color).toBeFalsy();
    expect(store2.selectionInputs[0].color).toBeTruthy();
    expect(highlightedZones(container)).toEqual(["D5"]);
  });

  test("color is kept between focuses", () => {
    const { store } = makeStore(SelectionInputStore, ["D4"]);
    store.focusById(idOfRange(store, 0));
    const color = store.selectionInputs[0].color;
    expect(color).toBeTruthy();
    store.unfocus();
    expect(store.selectionInputs[0].color).toBe(null);
    store.focusById(idOfRange(store, 0));
    expect(store.selectionInputs[0].color).toBe(color);
  });

  test("Pre-existing ranges from other sheets are selected", () => {
    const { store, model, container } = makeStore(SelectionInputStore, ["Sheet2!A2"]);
    createSheet(model, { sheetId: "42", name: "Sheet2", activate: false });
    expect(store.selectionInputs[0].xc).toBe("Sheet2!A2");
    store.focusById(idOfRange(store, 0));
    expect(highlightedZones(container)).toEqual([]);
    const firstSheetId = model.getters.getActiveSheetId();
    activateSheet(model, "42", firstSheetId);
    expect(highlightedZones(container)).toEqual(["A2"]);
    expect(store.highlights[0]).toMatchObject({
      sheetId: "42",
      zone: toZone("A2"),
    });
  });

  test("can select multiple ranges in another sheet", () => {
    const { store, model, container } = makeStore(SelectionInputStore);
    selectCell(model, "A1");
    expect(store.selectionInputs[0].xc).toBe("A1");
    expect(highlightedZones(container)).toEqual(["A1"]);
    const firstSheetId = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42", activate: true });
    addCellToSelection(model, "B2");
    expect(store.selectionInputs).toHaveLength(2);
    expect(store.selectionInputs[0].xc).toBe("A1");
    expect(store.selectionInputs[1].xc).toBe("Sheet2!B2");
    expect(highlightedZones(container)).toEqual(["B2"]);
    addCellToSelection(model, "B3");
    expect(store.selectionInputs).toHaveLength(3);
    expect(store.selectionInputs[0].xc).toBe("A1");
    expect(store.selectionInputs[1].xc).toBe("Sheet2!B2");
    expect(store.selectionInputs[2].xc).toBe("Sheet2!B3");
    expect(highlightedZones(container)).toEqual(["B2", "B3"]);
    activateSheet(model, firstSheetId);
    expect(highlightedZones(container)).toEqual(["A1"]);
  });

  test.each(["sheet name", "Sheet+", "Sheet:)"])(
    "can select a range  with special characters in its name: %s",
    (sheetName) => {
      const { store, model } = makeStore(SelectionInputStore);
      createSheetWithName(model, { sheetId: "42", activate: true }, sheetName);
      selectCell(model, "A1");
      expect(store.selectionInputs[0].xc).toBe(`'${sheetName}'!A1`);
    }
  );

  test("focus while in other sheet", () => {
    const { store, model } = makeStore(SelectionInputStore);
    selectCell(model, "A1");
    createSheet(model, { sheetId: "42", activate: true });
    store.unfocus();
    let [range] = store.selectionInputs;
    store.focusById(range.id);
    [range] = store.selectionInputs;
    expect(range.xc).toBe("A1");
  });

  test("mixing ranges from different sheets in the same input", () => {
    const { store, model, container } = makeStore(SelectionInputStore);
    createSheet(model, { sheetId: "42", position: 1 });
    expect(model.getters.getActiveSheet()).not.toBe("42");
    store.changeRange(idOfRange(store, 0), "A1, Sheet2!B3");
    let [range1, range2] = store.selectionInputs;
    expect(highlightedZones(container)).toEqual(["A1"]);
    expect(range1.xc).toBe("A1");
    expect(range2.xc).toBe("Sheet2!B3");
  });

  test("mixing ranges from different sheets in the same input in another sheet", () => {
    const { store, model, container } = makeStore(SelectionInputStore);
    createSheet(model, { sheetId: "42", activate: true });
    store.changeRange(idOfRange(store, 0), "Sheet2!B3, A1");
    let [range1, range2] = store.selectionInputs;
    expect(highlightedZones(container)).toEqual(["B3"]);
    expect(store.selectionInputs).toHaveLength(2);
    expect(range1.xc).toBe("Sheet2!B3");
    expect(range2.xc).toBe("A1");
  });

  test("manually adding a range from another sheet", () => {
    const { store, model } = makeStore(SelectionInputStore, ["A1"]);
    createSheet(model, { sheetId: "42", activate: true });
    expect(store.selectionInputs[0].xc).toBe("A1");
    store.focusById(idOfRange(store, 0));
    store.changeRange(idOfRange(store, 0), "A1, C5");
    expect(store.selectionInputs).toHaveLength(2);
    expect(store.selectionInputs[0].xc).toBe("A1");
    expect(store.selectionInputs[1].xc).toBe("C5");
  });

  test("highlights are set when activating another sheet", () => {
    const { store, model, container } = makeStore(SelectionInputStore);
    createSheet(model, { sheetId: "42", position: 1 });
    store.changeRange(idOfRange(store, 0), "Sheet2!B3, A1");
    expect(highlightedZones(container)).toEqual(["A1"]);
    activateSheet(model, "42");
    expect(highlightedZones(container)).toEqual(["B3"]);
  });

  test("input not focused when changing sheet", () => {
    const { store, model } = makeStore(SelectionInputStore, ["Sheet2!B2"]);
    createSheet(model, { sheetId: "42", position: 1 });
    store.focusById(idOfRange(store, 0));
    store.unfocus();
    expect(store.selectionInputs[0].isFocused).toBe(false);
    activateSheet(model, "42");
    expect(store.selectionInputs[0].isFocused).toBe(false);
  });

  test("input selection is reset only when changing sheet", () => {
    const { store, model, container } = makeStore(SelectionInputStore);
    createSheet(model, { sheetId: "42" });
    store.focusById(idOfRange(store, 0));
    selectCell(model, "B7");
    activateSheet(model, "42");
    moveAnchorCell(model, "down");
    expect(highlightedZones(container)).toEqual(["A2"]);
    activateSheet(model, "42");
    moveAnchorCell(model, "down");
    expect(highlightedZones(container)).toEqual(["A3"]);
  });

  test("focus and change range with unbounded ranges", () => {
    const { store } = makeStore(SelectionInputStore, ["A:A"]);
    store.focusById(idOfRange(store, 0));
    expect(store.selectionInputs[0].xc).toBe("A:A");
    store.changeRange(idOfRange(store, 0), "1:1");
    expect(store.selectionInputs[0].xc).toBe("1:1");
  });

  test("consistent range colors upon refocusing multiple times", () => {
    const { store } = makeStore(SelectionInputStore, ["B1:B5", "C1:C5"]);
    store.focusById(idOfRange(store, 0));
    const [initialFirstColor, initialSecondColor] = store.selectionInputs.map((i) => i.color);
    store.unfocus();
    store.focusById(idOfRange(store, 0));
    const [newFirstColor, newSecondColor] = store.selectionInputs.map((i) => i.color);
    expect(initialFirstColor).toBe(newFirstColor);
    expect(initialSecondColor).toBe(newSecondColor);
  });

  test("no duplicate range ids when creating and deleting ranges frequently", () => {
    const { store } = makeStore(SelectionInputStore, ["B1:B5", "C1:C5"]);
    store.addEmptyRange(); // id: 3
    store.addEmptyRange(); // id: 4
    store.removeRange(idOfRange(store, 2));
    store.addEmptyRange(); // id: 5
    const selectionInput = store.selectionInputs;
    expect(selectionInput.length).toEqual(4);
    expect(selectionInput.map((input) => input.id)).toStrictEqual([1, 2, 4, 5]);
  });

  test("Selection input is deactivated/ falls back on grid selection on a PASTE", () => {
    const { store, model } = makeStore(SelectionInputStore, ["B1:B2"]);
    setCellContent(model, "A1", "1");
    setSelection(model, ["A1:A2"]);
    copy(model, "A1:A2");
    store.focusById(idOfRange(store, 0));
    let input = store.selectionInputs;
    expect(input.length).toBe(1);
    expect(input[0]).toMatchObject({ xc: "B1:B2", isFocused: true });
    expect(model.getters.isGridSelectionActive()).toBe(false);
    paste(model, "C1:C2");
    input = store.selectionInputs;
    expect(input.length).toBe(1);
    expect(input[0]).toMatchObject({ xc: "B1:B2", isFocused: false });
    expect(model.getters.isGridSelectionActive()).toBe(true);
  });

  test("Can add a empty range to a second input without pre-focusing", () => {
    const { store: store1, container } = makeStore(SelectionInputStore, [], true);
    const store2 = container.instantiate(SelectionInputStore, []);
    store1.focusById(idOfRange(store1, 0));
    store2.addEmptyRange();
    expect(store2.selectionInputs).toHaveLength(2);
  });

  test("Can change the range of a second input without pre-focusing", () => {
    const { store: store1, container } = makeStore(SelectionInputStore, [], true);
    const store2 = container.instantiate(SelectionInputStore, []);
    store1.focusById(idOfRange(store1, 0));
    store2.changeRange(idOfRange(store2, 0), "F1,F2");
    expect(store2.selectionInputs).toHaveLength(2);
    expect(store2.selectionInputs[0].xc).toBe("F1");
    expect(store2.selectionInputs[1].xc).toBe("F2");
    expect(store2.selectionInputs[1].isFocused).toBe(true);
  });
});
