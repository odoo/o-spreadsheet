import { Model } from "../../src";
import { zoneToXc } from "../../src/helpers";
import { Store } from "../../src/store/dependency_container";
import { ModelStore } from "../../src/store/model_store";
import { SelectionInputStore } from "../../src/store/selection_input_store";
import { Highlight } from "../../src/types";
import {
  activateSheet,
  addCellToSelection,
  createSheet,
  createSheetWithName,
  merge,
  moveAnchorCell,
  resizeAnchorZone,
  selectCell,
  setAnchorCorner,
  setSelection,
} from "../test_helpers/commands_helpers";
import { makeStore, makeStoreContainer } from "../test_helpers/stores";

function select(model: Model, xc: string) {
  selectCell(model, xc);
  model.dispatch("STOP_SELECTION_INPUT");
}

/** returns the highlighted zone in the current sheet */
function highlightedZones(model: Model, store: Store<SelectionInputStore>): string[] {
  const sheetId = model.getters.getActiveSheetId();
  return store["selectionInputHighlights"]
    .filter((h) => h.sheetId === sheetId)
    .map((h) => h.zone)
    .map(zoneToXc);
}

/** returns the highlighted zone in the current sheet */
function getHighlights(model: Model, store: Store<SelectionInputStore>): Highlight[] {
  const sheetId = model.getters.getActiveSheetId();
  return store["selectionInputHighlights"].filter((h) => h.sheetId === sheetId);
}

function idOfRange(store: Store<SelectionInputStore>, rangeIndex: number): number {
  return store.selectionInputs[rangeIndex].id;
}

describe("selection input plugin", () => {
  let model: Model;
  let store: Store<SelectionInputStore>;
  beforeEach(() => {
    // create a helper function
    const stores = makeStoreContainer();
    model = stores.get(ModelStore);
    store = stores.get(SelectionInputStore);
  });

  test("empty input should focus the first range", () => {
    expect(store.selectionInputs.length).toBe(1);
    expect(store.selectionInputs[0].xc).toBe("");
    expect(store.selectionInputs[0].isFocused).toBe(true);
  });

  test("input with inital ranges should not be focused", () => {
    const stores = makeStoreContainer();
    model = stores.get(ModelStore);
    store = stores.instantiate(SelectionInputStore, ["D4"]);
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["D4"] });
    expect(store.selectionInputs.length).toBe(1);
    expect(store.selectionInputs[0].xc).toBe("D4");
    expect(store.selectionInputs[0].isFocused).toBeFalsy();
    // model is no linked to the new store
    expect(highlightedZones(model, store)).toStrictEqual([]);
  });

  test("multiple initial values have different ids", () => {
    const store = makeStore(SelectionInputStore, ["D4", "D5"]);
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["D4", "D5"] });
    const [range1, range2] = store.selectionInputs;
    expect(range1.id).not.toBe(range2.id);
  });

  test("focused input should change with selection", () => {
    store.focusById(idOfRange(store, 0));
    select(model, "C2");
    expect(store.selectionInputs[0].xc).toBe("C2");
    const firstColor = store.selectionInputs[0].color;
    expect(highlightedZones(model, store)).toStrictEqual(["C2"]);
    select(model, "D4");
    const secondColor = store.selectionInputs[0].color;
    expect(store.selectionInputs[0].xc).toBe("D4");
    expect(highlightedZones(model, store)).toStrictEqual(["D4"]);
    expect(firstColor).toBe(secondColor);
  });

  test("select cell inside a merge expands the selection", () => {
    merge(model, "A2:A4");
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    store.focusById(idOfRange(store, 0));
    // store.focusById(idOfRange(store, 0));
    setSelection(model, ["A3:A5"]);
    expect(store.selectionInputs[0].xc).toBe("A2:A5");
    expect(highlightedZones(model, store)).toStrictEqual(["A2:A5"]);
  });

  test("select cell inside a merge expands the selection of a single range input", () => {
    const stores = makeStoreContainer();
    const model = stores.get(ModelStore);
    selectCell(model, "B1");
    merge(model, "A2:A4");
    store = stores.instantiate(SelectionInputStore, [], true);
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, hasSingleRange: true });
    store.focusById(idOfRange(store, 0));
    model.dispatch("PREPARE_SELECTION_INPUT_EXPANSION");
    selectCell(model, "A4");
    setAnchorCorner(model, "A3");
    expect(store.selectionInputs[0].xc).toBe("A2:A4");
    expect(highlightedZones(model, store)).toStrictEqual(["A2:A4"]);
    setAnchorCorner(model, "A2");
    expect(store.selectionInputs[0].xc).toBe("A2:A4");
    expect(highlightedZones(model, store)).toStrictEqual(["A2:A4"]);
  });

  // test("focus input which is already focused", () => {
  //   // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
  //   store.focusById(idOfRange(store, 0));
  //   const result = store.focusById(idOfRange(store, 0));
  //   expect(result).toBeCancelledBecause(CommandResult.InputAlreadyFocused);
  // });

  test("focused input should not change when selecting a zone for composer", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    store.focusById(idOfRange(store, 0));
    model.dispatch("START_EDITION", { text: "=" });
    select(model, "C2");
    expect(store.selectionInputs[0].xc).toBe("");
  });

  test("expanding a selection fills empty input then adds a new input", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    store.focusById(idOfRange(store, 0));
    selectCell(model, "C2");
    expect(store.selectionInputs.length).toBe(1);
    expect(store.selectionInputs.map((i) => i.xc)).toEqual(["C2"]);
    expect(highlightedZones(model, store)).toStrictEqual(["C2"]);
    model.dispatch("PREPARE_SELECTION_INPUT_EXPANSION");
    selectCell(model, "D2");
    expect(store.selectionInputs.length).toBe(2);
    expect(store.selectionInputs.map((i) => i.xc)).toEqual(["C2", "D2"]);
    expect(highlightedZones(model, store)).toStrictEqual(["C2", "D2"]);
    const [firstColor, secondColor] = store.selectionInputs.map((i) => i.color);
    expect(firstColor).not.toBe(secondColor);
  });

  test("expanding a selection focuses the last range", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    store.focusById(idOfRange(store, 0));
    select(model, "C2");
    model.dispatch("PREPARE_SELECTION_INPUT_EXPANSION");
    selectCell(model, "D2");
    expect(store.selectionInputs[1].isFocused).toBe(true);
  });

  test("expanding a selection does not add input if maximum is reached", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, hasSingleRange: true });
    const stores = makeStoreContainer();
    model = stores.get(ModelStore);
    store = stores.instantiate(SelectionInputStore, [], true);
    select(model, "C2");
    model.dispatch("PREPARE_SELECTION_INPUT_EXPANSION");
    selectCell(model, "D2");
    expect(store.selectionInputs).toHaveLength(1);
    expect(store.selectionInputs[0].xc).toBe("D2");
  });

  test("cannot add empty range when maximum ranges reached", () => {
    const store = makeStore(SelectionInputStore, [], true);
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, hasSingleRange: true });
    expect(store.selectionInputs).toHaveLength(1);
    store.addEmptyRange();
    expect(store.selectionInputs).toHaveLength(1);
    // expect(model.dispatch("ADD_EMPTY_RANGE", { id })).toBeCancelledBecause(
    //   CommandResult.MaximumRangesReached
    // );
  });

  test("add an empty range", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    expect(store.selectionInputs.length).toBe(1);
    store.addEmptyRange();
    // store.addEmptyRange();
    expect(store.selectionInputs.length).toBe(2);
    expect(store.selectionInputs[1].isFocused).toBe(true);
    expect(store.selectionInputs[1].xc).toBe("");
  });

  test("add an empty range with initial value", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["A5"] });
    const stores = makeStoreContainer();
    model = stores.get(ModelStore);
    store = stores.instantiate(SelectionInputStore, ["A5"]);
    expect(store.selectionInputs.length).toBe(1);
    store.addEmptyRange();
    expect(store.selectionInputs.length).toBe(2);
    expect(store.selectionInputs[1].isFocused).toBe(true);
    expect(store.selectionInputs[1].xc).toBe("");
  });

  test("remove a range", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    store.addEmptyRange();
    const ids = store.selectionInputs.map((i) => i.id);
    expect(store.selectionInputs.length).toBe(2);
    // store.removeRange(idOfRange(store, 0))
    store.removeRange(idOfRange(store, 0));
    expect(store.selectionInputs.length).toBe(1);
    expect(store.selectionInputs.map((i) => i.id)).toEqual([ids[1]]);
  });

  test("last range is focused when one is removed", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    store.addEmptyRange();
    store.addEmptyRange();
    store.addEmptyRange();
    expect(store.selectionInputs.length).toBe(4);
    store.removeRange(idOfRange(store, 0));
    expect(store.selectionInputs.length).toBe(3);
    expect(store.selectionInputs[2].isFocused).toBe(true);
  });

  test("ranges are unfocused", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    expect(store.selectionInputs[0].isFocused).toBe(true);
    store.unfocus();
    expect(store.selectionInputs[0].isFocused).toBeFalsy();
  });

  test("same range is updated while selecting", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    selectCell(model, "C2");
    expect(store.selectionInputs[0].xc).toBe("C2");
    selectCell(model, "D2");
    expect(store.selectionInputs[0].xc).toBe("D2");
  });

  test("same range is updated while expanding", () => {
    const stores = makeStoreContainer();
    model = stores.get(ModelStore);
    store = stores.instantiate(SelectionInputStore, ["A1"]);
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["A1"] });
    store.addEmptyRange();

    model.dispatch("PREPARE_SELECTION_INPUT_EXPANSION");
    selectCell(model, "C2");
    expect(store.selectionInputs[1].xc).toBe("C2");
    setAnchorCorner(model, "D2");
    expect(store.selectionInputs[1].xc).toBe("C2:D2");
  });

  test("same color while selecting", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    selectCell(model, "C2");
    const color = store.selectionInputs[0].color;
    expect(color).toBeTruthy();
    selectCell(model, "D2");
    expect(store.selectionInputs[0].color).toBe(color);
  });

  test("same color with new selection in same range", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    select(model, "C2");
    const color = store.selectionInputs[0].color;
    selectCell(model, "D2");
    expect(store.selectionInputs[0].color).toBe(color);
  });

  test("color changes when expanding selection", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    select(model, "C2");
    const color = store.selectionInputs[0].color;
    model.dispatch("PREPARE_SELECTION_INPUT_EXPANSION");
    selectCell(model, "D2");
    expect(store.selectionInputs[1].color).not.toEqual(color);
  });

  test("color changes in new input", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    select(model, "C2");
    const color = store.selectionInputs[0].color;
    store.addEmptyRange();
    select(model, "C2");
    expect(store.selectionInputs[1].color).not.toBe(color);
  });

  test("focus does not change values", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["A1", "B2"] });
    const stores = makeStoreContainer();
    model = stores.get(ModelStore);
    store = stores.instantiate(SelectionInputStore, ["A1", "B2"]);
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

  test("focus other input does not use the focused input previous color", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    store.addEmptyRange();
    expect(store.selectionInputs[1].isFocused).toBe(true);
    select(model, "C2");
    const firstColor = store.selectionInputs[1].color;
    store.focusById(idOfRange(store, 0));
    select(model, "C3");
    const secondColor = store.selectionInputs[0].color;
    expect(highlightedZones(model, store).length).toBe(2);
    expect(firstColor).not.toBe(secondColor);
  });

  test("manually changing the input updates highlighted zone", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    store.addEmptyRange();
    store.changeRange(idOfRange(store, 0), "C5");
    // store.changeRange(idOfRange(store, 0), "C5");
    expect(store.selectionInputs[0].xc).toBe("C5");
    expect(highlightedZones(model, store)).toStrictEqual(["C5"]);
  });

  test("selection input updates handle full column ranges", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    store.addEmptyRange();
    store.changeRange(idOfRange(store, 0), "A3:A");
    expect(store.selectionInputs[0].xc).toBe("A3:A");
    expect(highlightedZones(model, store)).toEqual(["A3:A100"]);
  });

  test("selection input updates handle full row ranges", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    store.addEmptyRange();
    store.changeRange(idOfRange(store, 0), "F3:3");
    expect(store.selectionInputs[0].xc).toBe("F3:3");
    expect(highlightedZones(model, store)).toEqual(["F3:Z3"]);
  });

  test("manually changing the input with existing range", () => {
    const stores = makeStoreContainer();
    model = stores.get(ModelStore);
    store = stores.instantiate(SelectionInputStore, ["A8"]);
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["A8"] });
    store.changeRange(idOfRange(store, 0), "A8, C5");
    expect(store.selectionInputs[0].xc).toBe("A8");
    expect(store.selectionInputs[1].xc).toBe("C5");
    expect(store.selectionInputs[1].isFocused).toBe(true);
    expect(highlightedZones(model, store)).toStrictEqual(["A8", "C5"]);
  });

  test("setting multiple ranges in one input", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    store.addEmptyRange();
    store.changeRange(idOfRange(store, 0), "C5, D8, B2");
    const [range1, range2, range3] = store.selectionInputs;
    expect(range1.xc).toBe("C5");
    expect(range2.xc).toBe("D8");
    expect(range3.xc).toBe("B2");
    expect(range1.id).not.toBe(range2.id);
    expect(range2.id).not.toBe(range3.id);
    expect(highlightedZones(model, store)).toStrictEqual(["C5", "D8", "B2"]);
    const [firstColor, secondColor, thirdColor] = getHighlights(model, store).map((h) => h.color);
    expect(firstColor).not.toBe(secondColor);
    expect(thirdColor).not.toBe(secondColor);
  });

  test("writing an invalid range does not crash", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    store.addEmptyRange();
    store.changeRange(idOfRange(store, 0), "This is invalid");
    // model.dispatch("CHANGE_RANGE", {
    //   id,
    //   rangeId: idOfRange(model, id, 0),
    //   value: "This is invalid",
    // });
    expect(store.selectionInputValues).toEqual(["This is invalid"]);
    expect(highlightedZones(model, store)).toStrictEqual([]);
  });

  test("writing an invalid range with valid ones keeps the invalid one", () => {
    const stores = makeStoreContainer();
    model = stores.get(ModelStore);
    store = stores.instantiate(SelectionInputStore, ["B2", "E3"]);
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["B2", "E3"] });
    store.focusById(idOfRange(store, 0));
    // model.dispatch("FOCUS_RANGE", {
    //   id,
    //   rangeId: idOfRange(model, id, 0),
    // });
    store.changeRange(idOfRange(store, 0), "A1, This is invalid");
    // model.dispatch("CHANGE_RANGE", {
    //   id,
    //   rangeId: idOfRange(model, id, 0),
    //   value: "A1, This is invalid",
    // });
    expect(highlightedZones(model, store)).toEqual(["A1", "E3"]);
    expect(store.selectionInputs).toHaveLength(3);
    expect(store.selectionInputs[0].xc).toBe("A1");
    expect(store.selectionInputs[1].xc).toBe("This is invalid");
    expect(store.selectionInputs[2].xc).toBe("E3");
    expect(store.selectionInputValues).toEqual(["A1", "This is invalid", "E3"]);
  });

  test("writing an empty range removes the highlight", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    store.changeRange(idOfRange(store, 0), "C2");
    expect(highlightedZones(model, store)).toStrictEqual(["C2"]);
    store.changeRange(idOfRange(store, 0), "");
    expect(highlightedZones(model, store)).toStrictEqual([]);
  });

  test("disable input removes highlighted zones", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    store.changeRange(idOfRange(store, 0), "C2");
    expect(highlightedZones(model, store)).toStrictEqual(["C2"]);
    store.dispose();
    // model.dispatch("DISABLE_SELECTION_INPUT", { id });
    expect(highlightedZones(model, store)).toStrictEqual([]);
  });

  test("initial ranges are not highlighted", () => {
    const stores = makeStoreContainer();
    model = stores.get(ModelStore);
    store = stores.instantiate(SelectionInputStore, ["C2", "D4"]);
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["C2", "D4"] });
    expect(store.selectionInputs.length).toBe(2);
    expect(highlightedZones(model, store).length).toBe(0);
  });

  test("ranges are split for value", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    store.changeRange(idOfRange(store, 0), "C2, D5");
    expect(store.selectionInputValues).toStrictEqual(["C2", "D5"]);
  });

  test("multiple ranges are combined", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    store.addEmptyRange();
    store.changeRange(idOfRange(store, 0), "C2");
    store.changeRange(idOfRange(store, 1), "C6");
    // model.dispatch("CHANGE_RANGE", { id, rangeId: idOfRange(model, id, 1), value: "C6");
    expect(store.selectionInputValues).toStrictEqual(["C2", "C6"]);
  });

  test("trailing commas and spaces are removed", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    store.changeRange(idOfRange(store, 0), "C2, ");
    expect(store.selectionInputValues).toStrictEqual(["C2"]);
  });

  test("leading commas and spaces are removed", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    store.changeRange(idOfRange(store, 0), " ,C2,B3");
    expect(store.selectionInputValues).toStrictEqual(["C2", "B3"]);
  });

  // test("new state does not keep previous range focus", () => {
  //   // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
  //   store.addEmptyRange(); // this range is now focused
  //   model.dispatch("DISABLE_SELECTION_INPUT", { id });
  //   expect(highlightedZones(model, store)).toEqual([]);
  //   // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id: "999", initialRanges: ["C2"] });
  //   expect(highlightedZones(model, store)).toEqual([]);
  //   // brand new focus should highlight the zone.
  //   model.dispatch("FOCUS_RANGE", { id: "999", rangeId: idOfRange(model, "999", 0) });
  //   expect(highlightedZones(model, store)).toEqual(["C2"]);
  // });

  test("selection expansion adds as many input as needed", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["C4"] });
    const stores = makeStoreContainer();
    model = stores.get(ModelStore);
    store = stores.instantiate(SelectionInputStore, ["C4"]);
    selectCell(model, "C2");
    store.focusById(idOfRange(store, 0));
    expect(highlightedZones(model, store)).toEqual(["C4"]);
    model.dispatch("PREPARE_SELECTION_INPUT_EXPANSION");
    selectCell(model, "D2");
    model.dispatch("STOP_SELECTION_INPUT");
    expect(highlightedZones(model, store)).toEqual(["C4", "D2"]);
    expect(store.selectionInputs[0].xc).toBe("C4");
    expect(store.selectionInputs[1].xc).toBe("D2");
  });

  test("multiple alter selection in a single range component", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", {
    //   id,
    //   initialRanges: ["C4"],
    //   hasSingleRange: true,
    // });
    const stores = makeStoreContainer();
    model = stores.get(ModelStore);
    store = stores.instantiate(SelectionInputStore, ["C4"], true);
    selectCell(model, "C2");
    store.focusById(idOfRange(store, 0));
    model.dispatch("PREPARE_SELECTION_INPUT_EXPANSION");
    selectCell(model, "E1");
    setAnchorCorner(model, "E2");
    setAnchorCorner(model, "E3");
    model.dispatch("STOP_SELECTION_INPUT");
    expect(highlightedZones(model, store)).toEqual(["E1:E3"]);
    expect(store.selectionInputs[0].xc).toBe("E1:E3");
  });

  test("selection expansion by altering selection adds inputs", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["D4"] });
    const stores = makeStoreContainer();
    model = stores.get(ModelStore);
    store = stores.instantiate(SelectionInputStore, ["D4"]);
    selectCell(model, "C2");
    store.focusById(idOfRange(store, 0));
    model.dispatch("PREPARE_SELECTION_INPUT_EXPANSION");
    selectCell(model, "D2");
    expect(highlightedZones(model, store)).toEqual(["D4", "D2"]);
    resizeAnchorZone(model, "right");
    expect(highlightedZones(model, store)).toEqual(["D4", "D2:E2"]);
    expect(store.selectionInputs[0].xc).toBe("D4");
    expect(store.selectionInputs[1].xc).toBe("D2:E2");
  });

  test("Selections are not shared between selection inputs", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["D4"] });
    const stores = makeStoreContainer();
    model = stores.get(ModelStore);
    store = stores.instantiate(SelectionInputStore, ["D4"]);
    selectCell(model, "C2");
    store.focusById(idOfRange(store, 0));
    model.dispatch("PREPARE_SELECTION_INPUT_EXPANSION");
    addCellToSelection(model, "D2");
    expect(highlightedZones(model, store)).toEqual(["D4", "D2"]);
    resizeAnchorZone(model, "right");
    expect(highlightedZones(model, store)).toEqual(["D4", "D2:E2"]);
    expect(store.selectionInputs[0].xc).toBe("D4");
    expect(store.selectionInputs[1].xc).toBe("D2:E2");
  });

  test("highlights are updated when focus switched from one input to another", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id: "1", initialRanges: ["D4"] });
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id: "2", initialRanges: ["D5"] });
    const stores = makeStoreContainer();
    const model = stores.get(ModelStore);
    const store1 = stores.instantiate(SelectionInputStore, ["D4"]);
    const store2 = stores.instantiate(SelectionInputStore, ["D5"]);
    // model.dispatch("FOCUS_RANGE", { id: "1", rangeId: idOfRange(model, "1", 0) });
    store1.focusById(idOfRange(store1, 0));
    expect(store1.selectionInputs[0].isFocused).toBe(true);
    expect(store2.selectionInputs[0].isFocused).toBe(false);
    expect(store1.selectionInputs[0].color).toBeTruthy();
    expect(store2.selectionInputs[0].color).toBeFalsy();
    expect(highlightedZones(model, store1)).toEqual(["D4"]);
    expect(highlightedZones(model, store2)).toEqual([]);
    // model.dispatch("FOCUS_RANGE", { id: "2", rangeId: idOfRange(model, "2", 0) });
    store2.focusById(idOfRange(store1, 0));
    expect(store1.selectionInputs[0].isFocused).toBe(false);
    expect(store2.selectionInputs[0].isFocused).toBe(true);
    expect(store1.selectionInputs[0].color).toBeFalsy();
    expect(store2.selectionInputs[0].color).toBeTruthy();
    expect(highlightedZones(model, store1)).toEqual([]);
    expect(highlightedZones(model, store2)).toEqual(["D5"]);
  });

  test("color is kept between focuses", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["D4"] });
    const stores = makeStoreContainer();
    const store = stores.instantiate(SelectionInputStore, ["D4"]);
    // model.dispatch("FOCUS_RANGE", { id: "1", rangeId: idOfRange(model, "1", 0) });
    store.focusById(idOfRange(store, 0));
    const color = store.selectionInputs[0].color;
    expect(color).toBeTruthy();
    store.unfocus();
    expect(store.selectionInputs[0].color).toBe(null);
    store.focusById(idOfRange(store, 0));
    expect(store.selectionInputs[0].color).toBe(color);
  });

  test("Pre-existing ranges from other sheets are selected", () => {
    const stores = makeStoreContainer();
    const model = stores.get(ModelStore);
    createSheet(model, { sheetId: "42", name: "Sheet2", activate: false });
    const store = stores.instantiate(SelectionInputStore, ["Sheet2!A2"]);
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["Sheet2!A2"] });
    expect(store.selectionInputs[0].xc).toBe("Sheet2!A2");
    store.focusById(idOfRange(store, 0));
    expect(highlightedZones(model, store)).toEqual([]);
    const firstSheetId = model.getters.getActiveSheetId();
    activateSheet(model, "42", firstSheetId);
    expect(highlightedZones(model, store)).toEqual(["A2"]);
    // expect(highlightedZones(model, store)[0]).toEqual({
    //   sheetId: "42",
    //   zone: toZone("A2"),
    // });
  });

  test("can select multiple ranges in another sheet", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    select(model, "A1");
    expect(store.selectionInputs[0].xc).toBe("A1");
    expect(highlightedZones(model, store)).toEqual(["A1"]);
    const firstSheetId = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42", activate: true });
    model.dispatch("PREPARE_SELECTION_INPUT_EXPANSION");
    addCellToSelection(model, "B2");
    expect(store.selectionInputs).toHaveLength(2);
    expect(store.selectionInputs[0].xc).toBe("A1");
    expect(store.selectionInputs[1].xc).toBe("Sheet2!B2");
    expect(highlightedZones(model, store)).toEqual(["B2"]);
    model.dispatch("PREPARE_SELECTION_INPUT_EXPANSION");
    addCellToSelection(model, "B3");
    expect(store.selectionInputs).toHaveLength(3);
    expect(store.selectionInputs[0].xc).toBe("A1");
    expect(store.selectionInputs[1].xc).toBe("Sheet2!B2");
    expect(store.selectionInputs[2].xc).toBe("Sheet2!B3");
    expect(highlightedZones(model, store)).toEqual(["B2", "B3"]);
    activateSheet(model, firstSheetId);
    expect(highlightedZones(model, store)).toEqual(["A1"]);
  });

  test.each(["sheet name", "Sheet+", "Sheet:)"])(
    "can select a range  with special characters in its name: %s",
    (sheetName) => {
      // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
      createSheetWithName(model, { sheetId: "42", activate: true }, sheetName);
      select(model, "A1");
      expect(store.selectionInputs[0].xc).toBe(`'${sheetName}'!A1`);
    }
  );

  test("focus while in other sheet", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    select(model, "A1");
    createSheet(model, { sheetId: "42", activate: true });
    store.unfocus();
    let [range] = store.selectionInputs;
    // model.dispatch("FOCUS_RANGE", { id, rangeId: range.id });
    store.focusById(range.id);
    [range] = store.selectionInputs;
    expect(range.xc).toBe("A1");
  });

  test("mixing ranges from different sheets in the same input", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    model.dispatch("CREATE_SHEET", { sheetId: "42", position: 1 });
    expect(model.getters.getActiveSheet()).not.toBe("42");
    // model.dispatch("CHANGE_RANGE", {
    //   id,
    //   rangeId: idOfRange(model, id, 0),
    //   value: "A1, Sheet2!B3",
    // });
    store.changeRange(idOfRange(store, 0), "A1, Sheet2!B3");
    let [range1, range2] = store.selectionInputs;
    expect(highlightedZones(model, store)).toEqual(["A1"]);
    expect(range1.xc).toBe("A1");
    expect(range2.xc).toBe("Sheet2!B3");
  });

  test("mixing ranges from different sheets in the same input in another sheet", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    createSheet(model, { sheetId: "42", activate: true });
    // model.dispatch("CHANGE_RANGE", {
    //   id,
    //   rangeId: idOfRange(model, id, 0),
    //   value: "Sheet2!B3, A1",
    // });
    store.changeRange(idOfRange(store, 0), "Sheet2!B3, A1");
    let [range1, range2] = store.selectionInputs;
    expect(highlightedZones(model, store)).toEqual(["B3"]);
    expect(store.selectionInputs).toHaveLength(2);
    expect(range1.xc).toBe("Sheet2!B3");
    expect(range2.xc).toBe("A1");
  });

  test("manually adding a range from another sheet", () => {
    const stores = makeStoreContainer();
    const model = stores.get(ModelStore);
    const store = stores.get(SelectionInputStore, ["A1"]);
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["A1"] });
    createSheet(model, { sheetId: "42", activate: true });
    expect(store.selectionInputs[0].xc).toBe("A1");
    store.focusById(idOfRange(store, 0));
    store.changeRange(idOfRange(store, 0), "A1, C5");
    expect(store.selectionInputs).toHaveLength(2);
    expect(store.selectionInputs[0].xc).toBe("A1");
    expect(store.selectionInputs[1].xc).toBe("C5");
  });

  test("highlights are set when activating another sheet", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    model.dispatch("CREATE_SHEET", { sheetId: "42", position: 1 });
    // model.dispatch("CHANGE_RANGE", {
    //   id,
    //   rangeId: idOfRange(model, id, 0),
    //   value: "Sheet2!B3, A1",
    // });
    store.changeRange(idOfRange(store, 0), "Sheet2!B3, A1");
    expect(highlightedZones(model, store)).toEqual(["A1"]);
    activateSheet(model, "42");
    expect(highlightedZones(model, store)).toEqual(["B3"]);
  });

  test("input not focused when changing sheet", () => {
    const stores = makeStoreContainer();
    const model = stores.get(ModelStore);
    model.dispatch("CREATE_SHEET", { sheetId: "42", position: 1 });
    const store = stores.get(SelectionInputStore, ["Sheet2!B2"]);
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["Sheet2!B2"] });
    store.focusById(idOfRange(store, 0));
    store.unfocus();
    expect(store.selectionInputs[0].isFocused).toBe(false);
    activateSheet(model, "42");
    expect(store.selectionInputs[0].isFocused).toBe(false);
  });

  test("input selection is reset only when changing sheet", () => {
    createSheet(model, { sheetId: "42" });
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    store.focusById(idOfRange(store, 0));
    selectCell(model, "B7");
    activateSheet(model, "42");
    moveAnchorCell(model, "down");
    expect(highlightedZones(model, store)).toEqual(["A2"]);
    activateSheet(model, "42");
    moveAnchorCell(model, "down");
    expect(highlightedZones(model, store)).toEqual(["A3"]);
  });

  test("focus and change range with unbounded ranges", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["A:A"] });
    const stores = makeStoreContainer();
    model = stores.get(ModelStore);
    store = stores.instantiate(SelectionInputStore, ["A:A"]);
    store.focusById(idOfRange(store, 0));
    expect(store.selectionInputs[0].xc).toBe("A:A");
    store.changeRange(idOfRange(store, 0), "1:1");
    expect(store.selectionInputs[0].xc).toBe("1:1");
  });

  test("consistent range colors upon refocusing multiple times", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["B1:B5", "C1:C5"] });
    const stores = makeStoreContainer();
    model = stores.get(ModelStore);
    store = stores.instantiate(SelectionInputStore, ["B1:B5", "C1:C5"]);
    store.focusById(idOfRange(store, 0));
    // const [initialFirstColor, initalSecondColor] = model.getters
    //   .getSelectionInput(id)
    //   .map((i) => i.color);
    const [initialFirstColor, initialSecondColor] = store.selectionInputs.map((i) => i.color);
    // model.dispatch("DISABLE_SELECTION_INPUT", { id });
    store.unfocus();
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["B1:B5", "C1:C5"] });
    store.focusById(idOfRange(store, 0));
    const [newFirstColor, newSecondColor] = store.selectionInputs.map((i) => i.color);
    expect(initialFirstColor).toBe(newFirstColor);
    expect(initialSecondColor).toBe(newSecondColor);
  });

  test("no duplicate range ids when creating and deleting ranges frequently", () => {
    // model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["B1:B5", "C1:C5"] });
    const stores = makeStoreContainer();
    model = stores.get(ModelStore);
    store = stores.instantiate(SelectionInputStore, ["B1:B5", "C1:C5"]);
    store.addEmptyRange(); // id: 3
    store.addEmptyRange(); // id: 4
    store.removeRange(idOfRange(store, 2));
    // model.dispatch("REMOVE_RANGE", { id, rangeId: idOfRange(model, id, 2) });
    store.addEmptyRange(); // id: 5
    const selectionInput = store.selectionInputs;
    expect(selectionInput.length).toEqual(4);
    expect(selectionInput.map((input) => input.id)).toStrictEqual([1, 2, 4, 5]);
  });
});
