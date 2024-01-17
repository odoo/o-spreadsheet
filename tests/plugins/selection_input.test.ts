import { Model } from "../../src";
import { toZone, zoneToXc } from "../../src/helpers";
import { CommandResult } from "../../src/types";
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

function select(model: Model, xc: string) {
  selectCell(model, xc);
  model.dispatch("STOP_SELECTION_INPUT");
}

/** returns the highlighted zone in the current sheet */
function highlightedZones(model: Model) {
  const sheetId = model.getters.getActiveSheetId();
  return model.getters
    .getHighlights()
    .filter((h) => h.sheetId === sheetId)
    .map((h) => h.zone)
    .map(zoneToXc);
}

function idOfRange(model: Model, id: string, rangeIndex: number): string {
  return model.getters.getSelectionInput(id)[rangeIndex].id;
}

describe("selection input plugin", () => {
  let model: Model;
  const id = "1";
  beforeEach(() => {
    model = new Model();
  });

  test("empty input should focus the first range", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    expect(model.getters.getSelectionInput(id).length).toBe(1);
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("");
    expect(model.getters.getSelectionInput(id)[0].isFocused).toBe(true);
  });

  test("input with inital ranges should not be focused", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["D4"] });
    expect(model.getters.getSelectionInput(id).length).toBe(1);
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("D4");
    expect(model.getters.getSelectionInput(id)[0].isFocused).toBeFalsy();
    expect(highlightedZones(model)).toStrictEqual([]);
  });

  test("multiple initial values have different ids", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["D4", "D5"] });
    const [range1, range2] = model.getters.getSelectionInput(id);
    expect(range1.id).not.toBe(range2.id);
  });

  test("focused input should change with selection", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    model.dispatch("FOCUS_RANGE", { id, rangeId: idOfRange(model, id, 0) });
    select(model, "C2");
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("C2");
    const firstColor = model.getters.getSelectionInput(id)[0].color;
    expect(highlightedZones(model)).toStrictEqual(["C2"]);
    select(model, "D4");
    const secondColor = model.getters.getSelectionInput(id)[0].color;
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("D4");
    expect(highlightedZones(model)).toStrictEqual(["D4"]);
    expect(firstColor).toBe(secondColor);
  });

  test("select cell inside a merge expands the selection", () => {
    merge(model, "A2:A4");
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    model.dispatch("FOCUS_RANGE", { id, rangeId: idOfRange(model, id, 0) });
    setSelection(model, ["A3:A5"]);
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("A2:A5");
    expect(highlightedZones(model)).toStrictEqual(["A2:A5"]);
  });

  test("select cell inside a merge expands the selection of a single range input", () => {
    selectCell(model, "B1");
    merge(model, "A2:A4");
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, hasSingleRange: true });
    model.dispatch("FOCUS_RANGE", { id, rangeId: idOfRange(model, id, 0) });
    model.dispatch("PREPARE_SELECTION_INPUT_EXPANSION");
    selectCell(model, "A4");
    setAnchorCorner(model, "A3");
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("A2:A4");
    expect(highlightedZones(model)).toStrictEqual(["A2:A4"]);
    setAnchorCorner(model, "A2");
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("A2:A4");
    expect(highlightedZones(model)).toStrictEqual(["A2:A4"]);
  });

  test("focus input which is already focused", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    model.dispatch("FOCUS_RANGE", { id, rangeId: idOfRange(model, id, 0) });
    const result = model.dispatch("FOCUS_RANGE", { id, rangeId: idOfRange(model, id, 0) });
    expect(result).toBeCancelledBecause(CommandResult.InputAlreadyFocused);
  });

  test("focused input should not change when selecting a zone for composer", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    model.dispatch("FOCUS_RANGE", { id, rangeId: idOfRange(model, id, 0) });
    model.dispatch("START_EDITION", { text: "=" });
    select(model, "C2");
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("");
  });

  test("expanding a selection fills empty input then adds a new input", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    model.dispatch("FOCUS_RANGE", { id, rangeId: idOfRange(model, id, 0) });
    selectCell(model, "C2");
    expect(model.getters.getSelectionInput(id).length).toBe(1);
    expect(model.getters.getSelectionInput(id).map((i) => i.xc)).toEqual(["C2"]);
    expect(highlightedZones(model)).toStrictEqual(["C2"]);
    model.dispatch("PREPARE_SELECTION_INPUT_EXPANSION");
    selectCell(model, "D2");
    expect(model.getters.getSelectionInput(id).length).toBe(2);
    expect(model.getters.getSelectionInput(id).map((i) => i.xc)).toEqual(["C2", "D2"]);
    expect(highlightedZones(model)).toStrictEqual(["C2", "D2"]);
    const [firstColor, secondColor] = model.getters.getSelectionInput(id).map((i) => i.color);
    expect(firstColor).not.toBe(secondColor);
  });

  test("expanding a selection focuses the last range", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    model.dispatch("FOCUS_RANGE", { id, rangeId: idOfRange(model, id, 0) });
    select(model, "C2");
    model.dispatch("PREPARE_SELECTION_INPUT_EXPANSION");
    selectCell(model, "D2");
    expect(model.getters.getSelectionInput(id)[1].isFocused).toBe(true);
  });

  test("expanding a selection does not add input if maximum is reached", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, hasSingleRange: true });
    select(model, "C2");
    model.dispatch("PREPARE_SELECTION_INPUT_EXPANSION");
    selectCell(model, "D2");
    expect(model.getters.getSelectionInput(id)).toHaveLength(1);
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("D2");
  });

  test("cannot add empty range when maximum ranges reached", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, hasSingleRange: true });
    expect(model.getters.getSelectionInput(id)).toHaveLength(1);
    expect(model.dispatch("ADD_EMPTY_RANGE", { id })).toBeCancelledBecause(
      CommandResult.MaximumRangesReached
    );
  });

  test("Cannot add multiple ranges to a 'singleRange' input", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, hasSingleRange: true });
    expect(model.getters.getSelectionInput(id)).toHaveLength(1);
    expect(
      model.dispatch("CHANGE_RANGE", { id, rangeId: idOfRange(model, id, 0), value: "A3,A1" })
    ).toBeCancelledBecause(CommandResult.MaximumRangesReached);
  });

  test("add an empty range", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    expect(model.getters.getSelectionInput(id).length).toBe(1);
    model.dispatch("ADD_EMPTY_RANGE", { id });
    expect(model.getters.getSelectionInput(id).length).toBe(2);
    expect(model.getters.getSelectionInput(id)[1].isFocused).toBe(true);
    expect(model.getters.getSelectionInput(id)[1].xc).toBe("");
  });

  test("add an empty range with initial value", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["A5"] });
    expect(model.getters.getSelectionInput(id).length).toBe(1);
    model.dispatch("ADD_EMPTY_RANGE", { id });
    expect(model.getters.getSelectionInput(id).length).toBe(2);
    expect(model.getters.getSelectionInput(id)[1].isFocused).toBe(true);
    expect(model.getters.getSelectionInput(id)[1].xc).toBe("");
  });

  test("remove a range", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    model.dispatch("ADD_EMPTY_RANGE", { id });
    const ids = model.getters.getSelectionInput(id).map((i) => i.id);
    expect(model.getters.getSelectionInput(id).length).toBe(2);
    model.dispatch("REMOVE_RANGE", { id, rangeId: idOfRange(model, id, 0) });
    expect(model.getters.getSelectionInput(id).length).toBe(1);
    expect(model.getters.getSelectionInput(id).map((i) => i.id)).toEqual([ids[1]]);
  });

  test("last range is focused when one is removed", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    model.dispatch("ADD_EMPTY_RANGE", { id });
    model.dispatch("ADD_EMPTY_RANGE", { id });
    model.dispatch("ADD_EMPTY_RANGE", { id });
    expect(model.getters.getSelectionInput(id).length).toBe(4);
    model.dispatch("REMOVE_RANGE", { id, rangeId: idOfRange(model, id, 0) });
    expect(model.getters.getSelectionInput(id).length).toBe(3);
    expect(model.getters.getSelectionInput(id)[2].isFocused).toBe(true);
  });

  test("ranges are unfocused", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    expect(model.getters.getSelectionInput(id)[0].isFocused).toBe(true);
    model.dispatch("UNFOCUS_SELECTION_INPUT");
    expect(model.getters.getSelectionInput(id)[0].isFocused).toBeFalsy();
  });

  test("same range is updated while selecting", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    selectCell(model, "C2");
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("C2");
    selectCell(model, "D2");
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("D2");
  });

  test("same range is updated while expanding", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["A1"] });
    model.dispatch("ADD_EMPTY_RANGE", { id });

    model.dispatch("PREPARE_SELECTION_INPUT_EXPANSION");
    selectCell(model, "C2");
    expect(model.getters.getSelectionInput(id)[1].xc).toBe("C2");
    setAnchorCorner(model, "D2");
    expect(model.getters.getSelectionInput(id)[1].xc).toBe("C2:D2");
  });

  test("same color while selecting", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    selectCell(model, "C2");
    const color = model.getters.getSelectionInput(id)[0].color;
    expect(color).toBeTruthy();
    selectCell(model, "D2");
    expect(model.getters.getSelectionInput(id)[0].color).toBe(color);
  });

  test("same color with new selection in same range", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    select(model, "C2");
    const color = model.getters.getSelectionInput(id)[0].color;
    selectCell(model, "D2");
    expect(model.getters.getSelectionInput(id)[0].color).toBe(color);
  });

  test("color changes when expanding selection", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    select(model, "C2");
    const color = model.getters.getSelectionInput(id)[0].color;
    model.dispatch("PREPARE_SELECTION_INPUT_EXPANSION");
    selectCell(model, "D2");
    expect(model.getters.getSelectionInput(id)[1].color).not.toEqual(color);
  });

  test("color changes in new input", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    select(model, "C2");
    const color = model.getters.getSelectionInput(id)[0].color;
    model.dispatch("ADD_EMPTY_RANGE", { id });
    select(model, "C2");
    expect(model.getters.getSelectionInput(id)[1].color).not.toBe(color);
  });

  test("focus does not change values", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["A1", "B2"] });
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("A1");
    expect(model.getters.getSelectionInput(id)[1].xc).toBe("B2");
    expect(model.getters.getSelectionInput(id)[0].isFocused).toBe(false);
    expect(model.getters.getSelectionInput(id)[1].isFocused).toBe(false);
    model.dispatch("FOCUS_RANGE", { id, rangeId: idOfRange(model, id, 0) });
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("A1");
    expect(model.getters.getSelectionInput(id)[1].xc).toBe("B2");
    expect(model.getters.getSelectionInput(id)[0].isFocused).toBe(true);
    expect(model.getters.getSelectionInput(id)[1].isFocused).toBe(false);
  });

  test("focus other input does not use the focused input previous color", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    model.dispatch("ADD_EMPTY_RANGE", { id });
    expect(model.getters.getSelectionInput(id)[1].isFocused).toBe(true);
    select(model, "C2");
    const firstColor = model.getters.getSelectionInput(id)[1].color;
    model.dispatch("FOCUS_RANGE", { id, rangeId: idOfRange(model, id, 0) });
    select(model, "C3");
    const secondColor = model.getters.getSelectionInput(id)[0].color;
    expect(model.getters.getHighlights().length).toBe(2);
    expect(firstColor).not.toBe(secondColor);
  });

  test("manually changing the input updates highlighted zone", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    model.dispatch("ADD_EMPTY_RANGE", { id });
    model.dispatch("CHANGE_RANGE", { id, rangeId: idOfRange(model, id, 0), value: "C5" });
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("C5");
    expect(highlightedZones(model)).toStrictEqual(["C5"]);
  });

  test("selection input updates handle full column ranges", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    model.dispatch("ADD_EMPTY_RANGE", { id });
    model.dispatch("CHANGE_RANGE", { id, rangeId: idOfRange(model, id, 0), value: "A3:A" });
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("A3:A");
    expect(highlightedZones(model)).toEqual(["A3:A100"]);
  });

  test("selection input updates handle full row ranges", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    model.dispatch("ADD_EMPTY_RANGE", { id });
    model.dispatch("CHANGE_RANGE", { id, rangeId: idOfRange(model, id, 0), value: "F3:3" });
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("F3:3");
    expect(highlightedZones(model)).toEqual(["F3:Z3"]);
  });

  test("manually changing the input with existing range", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["A8"] });
    model.dispatch("CHANGE_RANGE", { id, rangeId: idOfRange(model, id, 0), value: "A8, C5" });
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("A8");
    expect(model.getters.getSelectionInput(id)[1].xc).toBe("C5");
    expect(model.getters.getSelectionInput(id)[1].isFocused).toBe(true);
    expect(highlightedZones(model)).toStrictEqual(["A8", "C5"]);
  });

  test("setting multiple ranges in one input", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    model.dispatch("ADD_EMPTY_RANGE", { id });
    model.dispatch("CHANGE_RANGE", { id, rangeId: idOfRange(model, id, 0), value: "C5, D8, B2" });
    const [range1, range2, range3] = model.getters.getSelectionInput(id);
    expect(range1.xc).toBe("C5");
    expect(range2.xc).toBe("D8");
    expect(range3.xc).toBe("B2");
    expect(range1.id).not.toBe(range2.id);
    expect(range2.id).not.toBe(range3.id);
    expect(highlightedZones(model)).toStrictEqual(["C5", "D8", "B2"]);
    const [firstColor, secondColor, thirdColor] = model.getters.getHighlights().map((h) => h.color);
    expect(firstColor).not.toBe(secondColor);
    expect(thirdColor).not.toBe(secondColor);
  });

  test("writing an invalid range does not crash", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    model.dispatch("ADD_EMPTY_RANGE", { id });
    model.dispatch("CHANGE_RANGE", {
      id,
      rangeId: idOfRange(model, id, 0),
      value: "This is invalid",
    });
    expect(model.getters.getSelectionInputValue(id)).toEqual(["This is invalid"]);
    expect(highlightedZones(model)).toStrictEqual([]);
  });

  test("writing an invalid range with valid ones keeps the invalid one", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["B2", "E3"] });
    model.dispatch("FOCUS_RANGE", {
      id,
      rangeId: idOfRange(model, id, 0),
    });
    model.dispatch("CHANGE_RANGE", {
      id,
      rangeId: idOfRange(model, id, 0),
      value: "A1, This is invalid",
    });
    expect(highlightedZones(model)).toEqual(["A1", "E3"]);
    expect(model.getters.getSelectionInput(id)).toHaveLength(3);
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("A1");
    expect(model.getters.getSelectionInput(id)[1].xc).toBe("This is invalid");
    expect(model.getters.getSelectionInput(id)[2].xc).toBe("E3");
    expect(model.getters.getSelectionInputValue(id)).toEqual(["A1", "This is invalid", "E3"]);
  });

  test("writing an empty range removes the highlight", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    model.dispatch("CHANGE_RANGE", { id, rangeId: idOfRange(model, id, 0), value: "C2" });
    expect(highlightedZones(model)).toStrictEqual(["C2"]);
    model.dispatch("CHANGE_RANGE", { id, rangeId: idOfRange(model, id, 0), value: "" });
    expect(highlightedZones(model)).toStrictEqual([]);
  });

  test("disable input removes highlighted zones", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    model.dispatch("CHANGE_RANGE", { id, rangeId: idOfRange(model, id, 0), value: "C2" });
    expect(highlightedZones(model)).toStrictEqual(["C2"]);
    model.dispatch("DISABLE_SELECTION_INPUT", { id });
    expect(highlightedZones(model)).toStrictEqual([]);
  });

  test("initial ranges are not highlighted", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["C2", "D4"] });
    expect(model.getters.getSelectionInput(id).length).toBe(2);
    expect(model.getters.getHighlights().length).toBe(0);
  });

  test("ranges are split for value", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    model.dispatch("CHANGE_RANGE", { id, rangeId: idOfRange(model, id, 0), value: "C2, D5" });
    expect(model.getters.getSelectionInputValue(id)).toStrictEqual(["C2", "D5"]);
  });

  test("multiple ranges are combined", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    model.dispatch("ADD_EMPTY_RANGE", { id });
    model.dispatch("CHANGE_RANGE", { id, rangeId: idOfRange(model, id, 0), value: "C2" });
    model.dispatch("CHANGE_RANGE", { id, rangeId: idOfRange(model, id, 1), value: "C6" });
    expect(model.getters.getSelectionInputValue(id)).toStrictEqual(["C2", "C6"]);
  });

  test("trailing commas and spaces are removed", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    model.dispatch("CHANGE_RANGE", { id, rangeId: idOfRange(model, id, 0), value: " ,C2, " });
    expect(model.getters.getSelectionInputValue(id)).toStrictEqual(["C2"]);
  });

  test("new state does not keep previous range focus", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    model.dispatch("ADD_EMPTY_RANGE", { id }); // this range is now focused
    model.dispatch("DISABLE_SELECTION_INPUT", { id });
    expect(highlightedZones(model)).toEqual([]);
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id: "999", initialRanges: ["C2"] });
    expect(highlightedZones(model)).toEqual([]);
    // brand new focus should highlight the zone.
    model.dispatch("FOCUS_RANGE", { id: "999", rangeId: idOfRange(model, "999", 0) });
    expect(highlightedZones(model)).toEqual(["C2"]);
  });

  test("selection expansion adds as many input as needed", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["C4"] });
    selectCell(model, "C2");
    model.dispatch("FOCUS_RANGE", { id, rangeId: idOfRange(model, id, 0) });
    expect(highlightedZones(model)).toEqual(["C4"]);
    model.dispatch("PREPARE_SELECTION_INPUT_EXPANSION");
    selectCell(model, "D2");
    model.dispatch("STOP_SELECTION_INPUT");
    expect(highlightedZones(model)).toEqual(["C4", "D2"]);
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("C4");
    expect(model.getters.getSelectionInput(id)[1].xc).toBe("D2");
  });

  test("multiple alter selection in a single range component", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", {
      id,
      initialRanges: ["C4"],
      hasSingleRange: true,
    });
    selectCell(model, "C2");
    model.dispatch("FOCUS_RANGE", { id, rangeId: idOfRange(model, id, 0) });
    model.dispatch("PREPARE_SELECTION_INPUT_EXPANSION");
    selectCell(model, "E1");
    setAnchorCorner(model, "E2");
    setAnchorCorner(model, "E3");
    model.dispatch("STOP_SELECTION_INPUT");
    expect(highlightedZones(model)).toEqual(["E1:E3"]);
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("E1:E3");
  });

  test("selection expansion by altering selection adds inputs", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["D4"] });
    selectCell(model, "C2");
    model.dispatch("FOCUS_RANGE", { id, rangeId: idOfRange(model, id, 0) });
    model.dispatch("PREPARE_SELECTION_INPUT_EXPANSION");
    selectCell(model, "D2");
    expect(highlightedZones(model)).toEqual(["D4", "D2"]);
    resizeAnchorZone(model, "right");
    expect(highlightedZones(model)).toEqual(["D4", "D2:E2"]);
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("D4");
    expect(model.getters.getSelectionInput(id)[1].xc).toBe("D2:E2");
  });

  test("Selections are not shared between selection inputs", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["D4"] });
    selectCell(model, "C2");
    model.dispatch("FOCUS_RANGE", { id, rangeId: idOfRange(model, id, 0) });
    model.dispatch("PREPARE_SELECTION_INPUT_EXPANSION");
    addCellToSelection(model, "D2");
    expect(highlightedZones(model)).toEqual(["D4", "D2"]);
    resizeAnchorZone(model, "right");
    expect(highlightedZones(model)).toEqual(["D4", "D2:E2"]);
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("D4");
    expect(model.getters.getSelectionInput(id)[1].xc).toBe("D2:E2");
  });

  test("highlights are updated when focus switched from one input to another", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id: "1", initialRanges: ["D4"] });
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id: "2", initialRanges: ["D5"] });
    model.dispatch("FOCUS_RANGE", { id: "1", rangeId: idOfRange(model, "1", 0) });
    expect(model.getters.getSelectionInput("1")[0].isFocused).toBe(true);
    expect(model.getters.getSelectionInput("2")[0].isFocused).toBe(false);
    expect(model.getters.getSelectionInput("1")[0].color).toBeTruthy();
    expect(model.getters.getSelectionInput("2")[0].color).toBeFalsy();
    expect(highlightedZones(model)).toEqual(["D4"]);
    model.dispatch("FOCUS_RANGE", { id: "2", rangeId: idOfRange(model, "2", 0) });
    expect(model.getters.getSelectionInput("1")[0].isFocused).toBe(false);
    expect(model.getters.getSelectionInput("2")[0].isFocused).toBe(true);
    expect(model.getters.getSelectionInput("1")[0].color).toBeFalsy();
    expect(model.getters.getSelectionInput("2")[0].color).toBeTruthy();
    expect(highlightedZones(model)).toEqual(["D5"]);
  });

  test("color is kept between focuses", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["D4"] });
    model.dispatch("FOCUS_RANGE", { id: "1", rangeId: idOfRange(model, "1", 0) });
    const color = model.getters.getSelectionInput(id)[0].color;
    expect(color).toBeTruthy();
    model.dispatch("UNFOCUS_SELECTION_INPUT");
    expect(model.getters.getSelectionInput(id)[0].color).toBe(null);
    model.dispatch("FOCUS_RANGE", { id, rangeId: idOfRange(model, id, 0) });
    expect(model.getters.getSelectionInput(id)[0].color).toBe(color);
  });

  test("Pre-existing ranges from other sheets are selected", () => {
    createSheet(model, { sheetId: "42", name: "Sheet2", activate: false });
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["Sheet2!A2"] });
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("Sheet2!A2");
    model.dispatch("FOCUS_RANGE", { id, rangeId: idOfRange(model, id, 0) });
    expect(highlightedZones(model)).toEqual([]);
    const firstSheetId = model.getters.getActiveSheetId();
    activateSheet(model, "42", firstSheetId);
    expect(highlightedZones(model)).toEqual(["A2"]);
    expect(model.getters.getHighlights()[0]).toMatchObject({
      sheetId: "42",
      zone: toZone("A2"),
    });
  });

  test("can select multiple ranges in another sheet", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    select(model, "A1");
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("A1");
    expect(highlightedZones(model)).toEqual(["A1"]);
    const firstSheetId = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42", activate: true });
    model.dispatch("PREPARE_SELECTION_INPUT_EXPANSION");
    addCellToSelection(model, "B2");
    expect(model.getters.getSelectionInput(id)).toHaveLength(2);
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("A1");
    expect(model.getters.getSelectionInput(id)[1].xc).toBe("Sheet2!B2");
    expect(highlightedZones(model)).toEqual(["B2"]);
    model.dispatch("PREPARE_SELECTION_INPUT_EXPANSION");
    addCellToSelection(model, "B3");
    expect(model.getters.getSelectionInput(id)).toHaveLength(3);
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("A1");
    expect(model.getters.getSelectionInput(id)[1].xc).toBe("Sheet2!B2");
    expect(model.getters.getSelectionInput(id)[2].xc).toBe("Sheet2!B3");
    expect(highlightedZones(model)).toEqual(["B2", "B3"]);
    activateSheet(model, firstSheetId);
    expect(highlightedZones(model)).toEqual(["A1"]);
  });

  test.each(["sheet name", "Sheet+", "Sheet:)"])(
    "can select a range  with special characters in its name: %s",
    (sheetName) => {
      model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
      createSheetWithName(model, { sheetId: "42", activate: true }, sheetName);
      select(model, "A1");
      expect(model.getters.getSelectionInput(id)[0].xc).toBe(`'${sheetName}'!A1`);
    }
  );

  test("focus while in other sheet", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    select(model, "A1");
    createSheet(model, { sheetId: "42", activate: true });
    model.dispatch("UNFOCUS_SELECTION_INPUT");
    let [range] = model.getters.getSelectionInput(id);
    model.dispatch("FOCUS_RANGE", { id, rangeId: range.id });
    [range] = model.getters.getSelectionInput(id);
    expect(range.xc).toBe("A1");
  });

  test("mixing ranges from different sheets in the same input", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    model.dispatch("CREATE_SHEET", { sheetId: "42", position: 1 });
    expect(model.getters.getActiveSheet()).not.toBe("42");
    model.dispatch("CHANGE_RANGE", {
      id,
      rangeId: idOfRange(model, id, 0),
      value: "A1, Sheet2!B3",
    });
    let [range1, range2] = model.getters.getSelectionInput(id);
    expect(highlightedZones(model)).toEqual(["A1"]);
    expect(range1.xc).toBe("A1");
    expect(range2.xc).toBe("Sheet2!B3");
  });

  test("mixing ranges from different sheets in the same input in another sheet", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    createSheet(model, { sheetId: "42", activate: true });
    model.dispatch("CHANGE_RANGE", {
      id,
      rangeId: idOfRange(model, id, 0),
      value: "Sheet2!B3, A1",
    });
    let [range1, range2] = model.getters.getSelectionInput(id);
    expect(highlightedZones(model)).toEqual(["B3"]);
    expect(model.getters.getSelectionInput(id)).toHaveLength(2);
    expect(range1.xc).toBe("Sheet2!B3");
    expect(range2.xc).toBe("A1");
  });

  test("manually adding a range from another sheet", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["A1"] });
    createSheet(model, { sheetId: "42", activate: true });
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("A1");
    model.dispatch("FOCUS_RANGE", { id, rangeId: idOfRange(model, id, 0) });
    model.dispatch("CHANGE_RANGE", { id, rangeId: idOfRange(model, id, 0), value: "A1, C5" });
    expect(model.getters.getSelectionInput(id)).toHaveLength(2);
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("A1");
    expect(model.getters.getSelectionInput(id)[1].xc).toBe("C5");
  });

  test("highlights are set when activating another sheet", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    model.dispatch("CREATE_SHEET", { sheetId: "42", position: 1 });
    model.dispatch("CHANGE_RANGE", {
      id,
      rangeId: idOfRange(model, id, 0),
      value: "Sheet2!B3, A1",
    });
    expect(highlightedZones(model)).toEqual(["A1"]);
    activateSheet(model, "42");
    expect(highlightedZones(model)).toEqual(["B3"]);
  });

  test("input not focused when changing sheet", () => {
    model.dispatch("CREATE_SHEET", { sheetId: "42", position: 1 });
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["Sheet2!B2"] });
    model.dispatch("FOCUS_RANGE", { id, rangeId: idOfRange(model, id, 0) });
    model.dispatch("UNFOCUS_SELECTION_INPUT");
    expect(model.getters.getSelectionInput(id)[0].isFocused).toBe(false);
    activateSheet(model, "42");
    expect(model.getters.getSelectionInput(id)[0].isFocused).toBe(false);
  });

  test("input selection is reset only when changing sheet", () => {
    createSheet(model, { sheetId: "42" });
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    model.dispatch("FOCUS_RANGE", { id, rangeId: idOfRange(model, id, 0) });
    selectCell(model, "B7");
    activateSheet(model, "42");
    moveAnchorCell(model, "down");
    expect(highlightedZones(model)).toEqual(["A2"]);
    activateSheet(model, "42");
    moveAnchorCell(model, "down");
    expect(highlightedZones(model)).toEqual(["A3"]);
  });

  test("focus and change range with unbounded ranges", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["A:A"] });
    model.dispatch("FOCUS_RANGE", { id, rangeId: idOfRange(model, id, 0) });
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("A:A");
    model.dispatch("CHANGE_RANGE", { id, rangeId: idOfRange(model, id, 0), value: "1:1" });
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("1:1");
  });

  test("consistent range colors upon refocusing multiple times", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["B1:B5", "C1:C5"] });
    model.dispatch("FOCUS_RANGE", { id, rangeId: idOfRange(model, id, 0) });
    const [initialFirstColor, initalSecondColor] = model.getters
      .getSelectionInput(id)
      .map((i) => i.color);
    model.dispatch("DISABLE_SELECTION_INPUT", { id });
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["B1:B5", "C1:C5"] });
    model.dispatch("FOCUS_RANGE", { id, rangeId: idOfRange(model, id, 0) });
    const [newFirstColor, newSecondColor] = model.getters.getSelectionInput(id).map((i) => i.color);
    expect(initialFirstColor).toBe(newFirstColor);
    expect(initalSecondColor).toBe(newSecondColor);
  });

  test("Cannot update ranges of inexisting input", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    const rangeId = idOfRange(model, id, 0);
    let result = model.dispatch("FOCUS_RANGE", { id: "fakeId", rangeId });
    expect(result).toBeCancelledBecause(CommandResult.InvalidInputId);
    result = model.dispatch("CHANGE_RANGE", { id: "fakeId", rangeId, value: "A1" });
    expect(result).toBeCancelledBecause(CommandResult.InvalidInputId);
    result = model.dispatch("ADD_EMPTY_RANGE", { id: "fakeId" });
    expect(result).toBeCancelledBecause(CommandResult.InvalidInputId);
    result = model.dispatch("REMOVE_RANGE", { id: "fakeId", rangeId });
    expect(result).toBeCancelledBecause(CommandResult.InvalidInputId);
  });

  test("Can add a empty range to a second input without pre-focusing", () => {
    const id2 = "2";
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, hasSingleRange: true });
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id: id2 });
    model.dispatch("FOCUS_RANGE", { id, rangeId: idOfRange(model, id, 0) });
    model.dispatch("ADD_EMPTY_RANGE", { id: id2 });
    expect(model.getters.getSelectionInput("2")).toHaveLength(2);
  });

  test("Can change the range of a second input without pre-focusing", () => {
    const id2 = "2";
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, hasSingleRange: true });
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id: id2 });
    model.dispatch("FOCUS_RANGE", { id, rangeId: idOfRange(model, id, 0) });
    model.dispatch("CHANGE_RANGE", { id: id2, rangeId: idOfRange(model, id2, 0), value: "F1,F2" });
    expect(model.getters.getSelectionInput(id2)).toHaveLength(2);
    expect(model.getters.getSelectionInput(id2)[0].xc).toBe("F1");
    expect(model.getters.getSelectionInput(id2)[1].xc).toBe("F2");
    expect(model.getters.getSelectionInput(id2)[1].isFocused).toBe(true);
  });
});
