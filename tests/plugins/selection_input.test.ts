import { Model } from "../../src";
import { zoneToXc } from "../../src/helpers";
import { CommandResult } from "../../src/types";
import {
  activateSheet,
  createSheet,
  createSheetWithName,
  selectCell,
} from "../test_helpers/commands_helpers";

function select(model: Model, xc: string) {
  model.dispatch("START_SELECTION");
  selectCell(model, xc);
  model.dispatch("STOP_SELECTION");
}

function highlightedZones(model: Model) {
  return model.getters
    .getHighlights()
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
  });

  test("focused input should change with selection", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    model.dispatch("FOCUS_RANGE", { id, rangeId: idOfRange(model, id, 0) });
    select(model, "C2");
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("C2");
  });

  test("focus input which is already focused", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    model.dispatch("FOCUS_RANGE", { id, rangeId: idOfRange(model, id, 0) });
    const result = model.dispatch("FOCUS_RANGE", { id, rangeId: idOfRange(model, id, 0) });
    expect(result).toBe(CommandResult.InputAlreadyFocused);
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
    model.dispatch("START_SELECTION");
    selectCell(model, "C2");
    expect(model.getters.getSelectionInput(id).length).toBe(1);
    expect(model.getters.getSelectionInput(id).map((i) => i.xc)).toEqual(["C2"]);
    model.dispatch("PREPARE_SELECTION_EXPANSION");
    model.dispatch("START_SELECTION_EXPANSION");
    selectCell(model, "D2");
    expect(model.getters.getSelectionInput(id).length).toBe(2);
    expect(model.getters.getSelectionInput(id).map((i) => i.xc)).toEqual(["C2", "D2"]);
  });

  test("expanding a selection focuses the last range", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    model.dispatch("FOCUS_RANGE", { id, rangeId: idOfRange(model, id, 0) });
    select(model, "C2");
    model.dispatch("PREPARE_SELECTION_EXPANSION");
    model.dispatch("START_SELECTION_EXPANSION");
    selectCell(model, "D2");
    expect(model.getters.getSelectionInput(id)[1].isFocused).toBe(true);
  });

  test("expanding a selection does not add input if maximum is reached", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, maximumRanges: 1 });
    select(model, "C2");
    model.dispatch("PREPARE_SELECTION_EXPANSION");
    model.dispatch("START_SELECTION_EXPANSION");
    selectCell(model, "D2");
    expect(model.getters.getSelectionInput(id)).toHaveLength(1);
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("C2");
  });

  test("adding multiple ranges does not add more input than maximum", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, maximumRanges: 2 });
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: {
        A1: { quantity: 1, color: "#000" },
        B1: { quantity: 1, color: "#000" },
        C1: { quantity: 1, color: "#000" },
      },
    });
    expect(model.getters.getSelectionInput(id)).toHaveLength(2);
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("A1");
    expect(model.getters.getSelectionInput(id)[1].xc).toBe("B1");
  });

  test("cannot add emty range when maximum ranges reached", async () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, maximumRanges: 1 });
    expect(model.getters.getSelectionInput(id)).toHaveLength(1);
    model.dispatch("ADD_EMPTY_RANGE", { id });
    expect(model.getters.getSelectionInput(id)).toHaveLength(1);
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
    model.dispatch("FOCUS_RANGE", { id, rangeId: null });
    expect(model.getters.getSelectionInput(id)[0].isFocused).toBeFalsy();
  });

  test("same range is updated while selecting", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    model.dispatch("START_SELECTION");
    selectCell(model, "C2");
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("C2");
    selectCell(model, "D2");
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("D2");
  });

  test("same range is updated while expanding", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["A1"] });
    model.dispatch("ADD_EMPTY_RANGE", { id });

    model.dispatch("PREPARE_SELECTION_EXPANSION");
    model.dispatch("START_SELECTION_EXPANSION");
    selectCell(model, "C2");
    expect(model.getters.getSelectionInput(id)[1].xc).toBe("C2");
    model.dispatch("ALTER_SELECTION", { cell: [3, 1] });
    expect(model.getters.getSelectionInput(id)[1].xc).toBe("C2:D2");
  });

  test("same color while selecting", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    model.dispatch("START_SELECTION");
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
    model.dispatch("PREPARE_SELECTION_EXPANSION");
    model.dispatch("START_SELECTION_EXPANSION");
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
    model.dispatch("CHANGE_RANGE", { id, rangeId: idOfRange(model, id, 0), value: "C5, D8" });
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("C5");
    expect(model.getters.getSelectionInput(id)[1].xc).toBe("D8");
    expect(highlightedZones(model)).toStrictEqual(["C5", "D8"]);
    const [firstColor, secondColor] = model.getters.getHighlights().map((h) => h.color);
    expect(firstColor).not.toBe(secondColor);
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
    expect(highlightedZones(model)).toEqual(["E3", "A1"]);
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

  test("mutliple ranges are combined", () => {
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
    model.dispatch("PREPARE_SELECTION_EXPANSION");
    model.dispatch("START_SELECTION_EXPANSION");
    selectCell(model, "D2");
    model.dispatch("STOP_SELECTION");
    expect(highlightedZones(model)).toEqual(["C4", "C2", "D2"]);
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("C4");
    expect(model.getters.getSelectionInput(id)[1].xc).toBe("C2");
    expect(model.getters.getSelectionInput(id)[2].xc).toBe("D2");
  });

  test("selection expansion by altering selection adds inputs", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["D4"] });
    selectCell(model, "C2");
    model.dispatch("FOCUS_RANGE", { id, rangeId: idOfRange(model, id, 0) });
    model.dispatch("PREPARE_SELECTION_EXPANSION");
    model.dispatch("START_SELECTION_EXPANSION");
    selectCell(model, "D2");
    expect(highlightedZones(model)).toEqual(["D4", "C2", "D2"]);
    model.dispatch("ALTER_SELECTION", { delta: [1, 0] });
    expect(highlightedZones(model)).toEqual(["D4", "C2", "D2:E2"]);
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("D4");
    expect(model.getters.getSelectionInput(id)[1].xc).toBe("C2");
    expect(model.getters.getSelectionInput(id)[2].xc).toBe("D2:E2");
  });

  test("highlights are updated when focus switched from one input to another", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id: "1", initialRanges: ["D4"] });
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id: "2", initialRanges: ["D5"] });
    model.dispatch("FOCUS_RANGE", { id: "1", rangeId: idOfRange(model, "1", 0) });
    expect(model.getters.getSelectionInput("1")[0].isFocused).toBe(true);
    expect(model.getters.getSelectionInput("2")[0].isFocused).toBe(false);
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
    model.dispatch("FOCUS_RANGE", { id, rangeId: null });
    expect(model.getters.getSelectionInput(id)[0].color).toBe(null);
    model.dispatch("FOCUS_RANGE", { id, rangeId: idOfRange(model, id, 0) });
    expect(model.getters.getSelectionInput(id)[0].color).toBe(color);
  });

  test("can select a range in another sheet", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    createSheet(model, { sheetId: "42", activate: true });
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: { A1: { quantity: 1, color: "#000" } },
    });
    expect(model.getters.getSelectionInput(id)[0].xc).toBe("Sheet2!A1");
  });

  test.each(["sheet name", "Sheet+", "Sheet:)"])(
    "can select a range  with special characters in its name: %s",
    (sheetName) => {
      model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
      createSheetWithName(model, { sheetId: "42", activate: true }, sheetName);
      model.dispatch("ADD_HIGHLIGHTS", {
        ranges: { A1: { quantity: 1, color: "#000" } },
      });
      expect(model.getters.getSelectionInput(id)[0].xc).toBe(`'${sheetName}'!A1`);
    }
  );

  test("focus while in other sheet", () => {
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id });
    model.dispatch("ADD_HIGHLIGHTS", {
      ranges: { A1: { quantity: 1, color: "#000" } },
    });
    createSheet(model, { sheetId: "42", activate: true });
    model.dispatch("FOCUS_RANGE", { id, rangeId: null });
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
    expect(highlightedZones(model)).toEqual(["A1", "B3"]);
  });

  test("input not focused when changing sheet", () => {
    model.dispatch("CREATE_SHEET", { sheetId: "42", position: 1 });
    model.dispatch("ENABLE_NEW_SELECTION_INPUT", { id, initialRanges: ["Sheet2!B2"] });
    model.dispatch("FOCUS_RANGE", { id, rangeId: idOfRange(model, id, 0) });
    model.dispatch("FOCUS_RANGE", { id, rangeId: null });
    expect(model.getters.getSelectionInput(id)[0].isFocused).toBe(false);
    activateSheet(model, "42");
    expect(model.getters.getSelectionInput(id)[0].isFocused).toBe(false);
  });
});
