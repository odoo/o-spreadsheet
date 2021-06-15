import { Model } from "../../src";
import { toCartesian, toZone } from "../../src/helpers";
import { AutofillPlugin } from "../../src/plugins/ui/autofill";
import { Border, ConditionalFormat, Style } from "../../src/types";
import { DIRECTION } from "../../src/types/index";
import "../helpers"; // to have getcontext mocks
import {
  getCell,
  getCellContent,
  getCellText,
  getMergeCellMap,
  getMerges,
  setCellContent,
  toPosition,
  XCToMergeCellMap,
} from "../helpers";

let autoFill: AutofillPlugin;
let model: Model;

/**
 * Select a zone
 */
function selectZone(range: string) {
  const zone = toZone(range);
  model.dispatch("SET_SELECTION", {
    anchor: [zone.left, zone.top],
    zones: [zone],
  });
}

/**
 * Autofill from a zone to a cell
 */
function autofill(from: string, to: string) {
  selectZone(from);
  const [col, row] = toCartesian(to);
  model.dispatch("AUTOFILL_SELECT", { col, row });
  model.dispatch("AUTOFILL");
}

/**
 * Retrieve the direction from a zone to a cell
 */
function getDirection(from: string, xc: string): DIRECTION {
  selectZone(from);
  const [col, row] = toCartesian(xc);
  return autoFill["getDirection"](col, row);
}

/**
 * Select a zone to autofill
 */
function select(from: string, xc: string) {
  selectZone(from);
  const [col, row] = toCartesian(xc);
  model.dispatch("AUTOFILL_SELECT", { col, row });
}

beforeEach(() => {
  model = new Model();
  autoFill = model["handlers"].find(
    (handler) => handler instanceof AutofillPlugin
  )! as AutofillPlugin;
});

describe("Autofill", () => {
  test.each([
    ["C3:D4", "A5", DIRECTION.LEFT],
    ["C3:D4", "B5", DIRECTION.DOWN],
    ["C3:D4", "D5", DIRECTION.DOWN],
    ["C3:D4", "E5", DIRECTION.DOWN],
    ["C3:D4", "F5", DIRECTION.RIGHT],
    ["C3:D4", "C2", DIRECTION.UP],
    ["C3:D4", "B2", DIRECTION.UP],
    ["C3:D4", "A2", DIRECTION.LEFT],
    ["C3:D4", "E2", DIRECTION.UP],
    ["C3:D4", "F2", DIRECTION.RIGHT],
    ["C3:D4", "B3", DIRECTION.LEFT],
    ["C3:D4", "E4", DIRECTION.RIGHT],
  ])("From %s, selecting %s, should return the direction %s", (from, xc, direction) => {
    expect(getDirection(from, xc)).toBe(direction);
  });

  test.each([
    ["C3:D4", "A5", "A3:B4"],
    ["C3:D4", "B5", "C5:D5"],
    ["C3:D4", "D5", "C5:D5"],
    ["C3:D4", "E5", "C5:D5"],
    ["C3:D4", "F5", "E3:F4"],
    ["C3:D4", "C2", "C2:D2"],
    ["C3:D4", "B2", "C2:D2"],
    ["C3:D4", "A2", "A3:B4"],
    ["C3:D4", "E2", "C2:D2"],
    ["C3:D4", "F2", "E3:F4"],
    ["C3:D4", "B3", "B3:B4"],
    ["C3:D4", "E4", "E3:E4"],
  ])("From %s, selecting %s should select the good zone (%s)", (from, xc, expected) => {
    select(from, xc);
    expect(autoFill["autofillZone"]).toEqual(toZone(expected));
  });

  test.each([
    ["1", "1", "number"],
    ["test", "test", "string"],
    ["=B1", "=B2", "formula"],
    ["01/01/2020", "01/02/2020", "date"],
  ])("Autofill %s DOWN should give %s", (text, expected, expectedType) => {
    setCellContent(model, "A1", text);
    autofill("A1", "A2");
    expect(getCellText(model, "A2")).toBe(expected);
  });

  test("Autofill keep style, border and format", () => {
    const sheetId = model.getters.getActiveSheetId();
    const col = 0;
    const row = 0;
    const border: Border = {
      left: ["thin", "#000"],
    };
    const style: Style = { textColor: "orange" };
    model.dispatch("UPDATE_CELL", {
      col,
      row,
      sheetId,
      style,
      format: "m/d/yyyy",
    });
    model.dispatch("SET_BORDER", { sheetId, col, row, border });
    autofill("A1", "A2");
    const cell = getCell(model, "A2")!;
    expect(cell.style).toEqual(style);
    expect(model.getters.getCellBorder(sheetId, 0, 1)).toEqual(border);
    expect(cell.format).toBe("m/d/yyyy");
  });

  test("Autofill add CF to target cell if present in origin cell", () => {
    model.dispatch("UPDATE_CELL", {
      col: 0,
      row: 0,
      sheetId: model.getters.getActiveSheetId(),
      content: "1",
    });
    autofill("A1", "A4");
    const cf: ConditionalFormat = {
      ranges: ["A1", "A2"],
      id: "1",
      rule: {
        values: ["1"],
        operator: "Equal",
        type: "CellIsRule",
        style: {
          fillColor: "#FF0000",
        },
      },
    };
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf,
      sheetId: model.getters.getActiveSheetId(),
    });
    expect(model.getters.getConditionalStyle(...toCartesian("A1"))).toEqual({
      fillColor: "#FF0000",
    });
    expect(model.getters.getConditionalStyle(...toCartesian("A2"))).toEqual({
      fillColor: "#FF0000",
    });
    expect(model.getters.getConditionalStyle(...toCartesian("A3"))).toBeFalsy();
    expect(model.getters.getConditionalStyle(...toCartesian("A4"))).toBeFalsy();
    autofill("A1:A4", "A8");
    expect(model.getters.getConditionalStyle(...toCartesian("A5"))).toEqual({
      fillColor: "#FF0000",
    });
    expect(model.getters.getConditionalStyle(...toCartesian("A6"))).toEqual({
      fillColor: "#FF0000",
    });
    expect(model.getters.getConditionalStyle(...toCartesian("A7"))).toBeFalsy();
    expect(model.getters.getConditionalStyle(...toCartesian("A8"))).toBeFalsy();
  });

  describe("Autofill multiple values", () => {
    test("Autofill numbers", () => {
      setCellContent(model, "A1", "1");
      setCellContent(model, "A2", "2");
      autofill("A1:A2", "A6");
      expect(getCellContent(model, "A3")).toBe("3");
      expect(getCellContent(model, "A4")).toBe("4");
      expect(getCellContent(model, "A5")).toBe("5");
      expect(getCellContent(model, "A6")).toBe("6");
    });

    test("Autofill dates", () => {
      setCellContent(model, "A1", "3/3/2003");
      setCellContent(model, "A2", "3/4/2003");
      autofill("A1:A2", "A6");
      expect(getCellText(model, "A3")).toBe("3/5/2003");
      expect(getCellText(model, "A4")).toBe("3/6/2003");
      expect(getCellText(model, "A5")).toBe("3/7/2003");
      expect(getCellText(model, "A6")).toBe("3/8/2003");
    });

    test("Autofill hours", () => {
      setCellContent(model, "A1", "10:26:04");
      setCellContent(model, "A2", "10:28:08");
      autofill("A1:A2", "A6");
      expect(getCellText(model, "A3")).toBe("10:30:12");
      expect(getCellText(model, "A4")).toBe("10:32:16");
      expect(getCellText(model, "A5")).toBe("10:34:20");
      expect(getCellText(model, "A6")).toBe("10:36:24");
    });

    test("Autofill percent", () => {
      setCellContent(model, "A1", "1%");
      setCellContent(model, "A2", "2%");
      autofill("A1:A2", "A6");
      expect(getCellText(model, "A3")).toBe("3%");
      expect(getCellText(model, "A4")).toBe("4%");
      expect(getCellText(model, "A5")).toBe("5%");
      expect(getCellText(model, "A6")).toBe("6%");
    });

    test("Autofill 2 non-consecutive numbers", () => {
      setCellContent(model, "A1", "1");
      setCellContent(model, "A2", "3");
      autofill("A1:A2", "A6");
      expect(getCellContent(model, "A3")).toBe("5");
      expect(getCellContent(model, "A4")).toBe("7");
      expect(getCellContent(model, "A5")).toBe("9");
      expect(getCellContent(model, "A6")).toBe("11");
    });

    test("Autofill more than 2 consecutive numbers", () => {
      setCellContent(model, "A1", "1");
      setCellContent(model, "A2", "3");
      setCellContent(model, "A3", "5");
      autofill("A1:A3", "A6");
      expect(getCellContent(model, "A4")).toBe("7");
      expect(getCellContent(model, "A5")).toBe("9");
      expect(getCellContent(model, "A6")).toBe("11");
    });

    test("Autofill non-trivial steps", () => {
      setCellContent(model, "A1", "1");
      setCellContent(model, "A2", "2");
      setCellContent(model, "A3", "4");
      autofill("A1:A3", "A6");
      expect(getCellContent(model, "A4")).toBe("5.5");
      expect(getCellContent(model, "A5")).toBe("6.5");
      expect(getCellContent(model, "A6")).toBe("8.5");
    });

    test("Autofill formulas", () => {
      setCellContent(model, "A1", "=B1");
      setCellContent(model, "A2", "=B2");
      autofill("A1:A2", "A6");
      expect(getCellText(model, "A3")).toBe("=B3");
      expect(getCellText(model, "A4")).toBe("=B4");
      expect(getCellText(model, "A5")).toBe("=B5");
      expect(getCellText(model, "A6")).toBe("=B6");
    });

    test.each([
      ["=B10000", "=B10001", "=B10002"],
      ["=B$10000", "=B$10000", "=B$10000"],
      ["=SUM(B100:B10000)", "=SUM(B101:B10001)", "=SUM(B102:B10002)"],
    ])("Autofill reference outside of sheet %s", (A1, expectedA2, expectedA3) => {
      setCellContent(model, "A1", A1);
      autofill("A1", "A3");
      expect(getCellText(model, "A2")).toBe(expectedA2);
      expect(getCellText(model, "A3")).toBe(expectedA3);
    });

    test.each([
      ["=$B1", "=$B2", "=$B3"],
      ["=$B$1", "=$B$1", "=$B$1"],
      ["=B$1", "=B$1", "=B$1"],
    ])("Autofill vertically fixed reference %s", (A1, expectedA2, expectedA3) => {
      setCellContent(model, "A1", A1);
      autofill("A1", "A3");
      expect(getCellText(model, "A2")).toBe(expectedA2);
      expect(getCellText(model, "A3")).toBe(expectedA3);
    });

    test.each([
      ["=$A2", "=$A2", "=$A2"],
      ["=$A$2", "=$A$2", "=$A$2"],
      ["=A$2", "=B$2", "=C$2"],
    ])("Autofill horizontally fixed reference %s", (A1, B1, C1) => {
      setCellContent(model, "A1", A1);
      autofill("A1", "C1");
      expect(getCellText(model, "B1")).toBe(B1);
      expect(getCellText(model, "C1")).toBe(C1);
    });

    test("Autofill text values", () => {
      setCellContent(model, "A1", "A");
      setCellContent(model, "A2", "B");
      autofill("A1:A2", "A6");
      expect(getCellContent(model, "A3")).toBe("A");
      expect(getCellContent(model, "A4")).toBe("B");
      expect(getCellContent(model, "A5")).toBe("A");
      expect(getCellContent(model, "A6")).toBe("B");
    });

    test("Autofill mixed values", () => {
      setCellContent(model, "A1", "1");
      setCellContent(model, "A2", "2");
      setCellContent(model, "A3", "test");
      autofill("A1:A3", "A9");
      expect(getCellContent(model, "A4")).toBe("3");
      expect(getCellContent(model, "A5")).toBe("4");
      expect(getCellContent(model, "A6")).toBe("test");
      expect(getCellContent(model, "A7")).toBe("5");
      expect(getCellContent(model, "A8")).toBe("6");
      expect(getCellContent(model, "A9")).toBe("test");
    });

    test("Autofill number and text", () => {
      setCellContent(model, "A1", "1");
      setCellContent(model, "A2", "test");
      autofill("A1:A2", "A4");
      expect(getCellContent(model, "A3")).toBe("2");
      expect(getCellContent(model, "A4")).toBe("test");
    });

    test("Autofill mixed-mixed values", () => {
      setCellContent(model, "A1", "1");
      setCellContent(model, "A2", "test");
      setCellContent(model, "A3", "-1");
      setCellContent(model, "A4", "-2");
      setCellContent(model, "A5", "-3");
      autofill("A1:A5", "A10");
      expect(getCellContent(model, "A6")).toBe("2");
      expect(getCellContent(model, "A7")).toBe("test");
      expect(getCellContent(model, "A8")).toBe("-4");
      expect(getCellContent(model, "A9")).toBe("-5");
      expect(getCellContent(model, "A10")).toBe("-6");
    });

    test("Autofill should override selected zone", () => {
      setCellContent(model, "A1", "1");
      const sheetId = model.getters.getActiveSheetId();
      const col = 0;
      const row = 1;
      const border: Border = {
        left: ["thin", "#000"],
      };
      const style: Style = { textColor: "orange" };
      model.dispatch("UPDATE_CELL", {
        sheetId,
        col,
        row,
        content: "test",
        style,
        format: "m/d/yyyy",
      });
      model.dispatch("SET_BORDER", { sheetId, col, row, border });
      autofill("A1", "A2");
      const cell = getCell(model, "A2")!;
      expect(cell.style).toBeUndefined();
      expect(model.getters.getCellBorder(sheetId, col, row)).toBeNull();
      expect(cell.format).toBeUndefined();
      expect(cell["content"]).toBe("1");
    });
  });

  test("Autofill functions", () => {
    setCellContent(model, "A1", "=B1");
    autofill("A1", "A3"); // DOWN
    expect(getCellText(model, "A2")).toBe("=B2");
    expect(getCellText(model, "A3")).toBe("=B3");
    setCellContent(model, "A1", "=A2");
    autofill("A1", "C1"); // RIGHT
    expect(getCellText(model, "B1")).toBe("=B2");
    expect(getCellText(model, "C1")).toBe("=C2");
    setCellContent(model, "B2", "=C3");
    autofill("B2", "A2"); // LEFT
    expect(getCellText(model, "A2")).toBe("=B3");
    expect(getCellText(model, "B2")).toBe("=C3");
    autofill("B2", "B1"); // UP
    expect(getCellText(model, "B1")).toBe("=C2");
  });

  test("Autofill empty cell should erase others", () => {
    setCellContent(model, "A2", "1");
    const sheetId = model.getters.getActiveSheetId();
    const col = 0;
    const row = 2;
    const border: Border = {
      left: ["thin", "#000"],
    };
    const style: Style = { textColor: "orange" };
    model.dispatch("UPDATE_CELL", {
      sheetId,
      col,
      row,
      style,
      format: "m/d/yyyy",
    });
    model.dispatch("SET_BORDER", { sheetId, col, row, border });
    autofill("A1", "A3");
    expect(getCell(model, "A2")).toBeUndefined();
    expect(getCell(model, "A3")).toBeUndefined();
    expect(model.getters.getCellBorder(sheetId, 0, 1)).toBeNull();
    expect(model.getters.getCellBorder(sheetId, 0, 2)).toBeNull();
  });

  test("Auto-autofill left", () => {
    setCellContent(model, "A2", "1");
    setCellContent(model, "A3", "1");
    setCellContent(model, "A4", "1");
    setCellContent(model, "B2", "2");
    selectZone("B2");
    model.dispatch("AUTOFILL_AUTO");
    expect(getCellContent(model, "B3")).toBe("2");
    expect(getCellContent(model, "B4")).toBe("2");
    expect(getCell(model, "B5")).toBeUndefined();
  });

  test("Auto-autofill right", () => {
    setCellContent(model, "B2", "1");
    setCellContent(model, "B3", "1");
    setCellContent(model, "B4", "1");
    setCellContent(model, "A2", "2");
    selectZone("A2");
    model.dispatch("AUTOFILL_AUTO");
    expect(getCellContent(model, "A3")).toBe("2");
    expect(getCellContent(model, "A4")).toBe("2");
    expect(getCell(model, "A5")).toBeUndefined();
  });

  test("autofill with merge in selection", () => {
    const sheet1 = model.getters.getActiveSheetId();
    model.dispatch("ADD_MERGE", { sheetId: sheet1, zone: toZone("A1:A2") });
    setCellContent(model, "A1", "1");
    autofill("A1:A3", "A9");
    expect(getMergeCellMap(model)).toEqual(
      XCToMergeCellMap(model, ["A1", "A2", "A4", "A5", "A7", "A8"])
    );
    expect(getMerges(model)).toEqual({
      "1": { bottom: 1, id: 1, left: 0, right: 0, top: 0, topLeft: toPosition("A1") },
      "2": { bottom: 4, id: 2, left: 0, right: 0, top: 3, topLeft: toPosition("A4") },
      "3": { bottom: 7, id: 3, left: 0, right: 0, top: 6, topLeft: toPosition("A7") },
    });
    expect(getCellContent(model, "A1")).toBe("1");
    expect(getCellContent(model, "A4")).toBe("2");
    expect(getCellContent(model, "A7")).toBe("3");
  });

  test("autofill with merge greater than the grid size", () => {
    model = new Model({
      sheets: [
        {
          colNumber: 1,
          rowNumber: 5,
        },
      ],
    });
    const sheet1 = model.getters.getActiveSheetId();
    model.dispatch("ADD_MERGE", { sheetId: sheet1, zone: toZone("A1:A2") });
    autofill("A1:A2", "A5");
    expect(getMergeCellMap(model)).toEqual(XCToMergeCellMap(model, ["A1", "A2", "A3", "A4"]));
    expect(getMerges(model)).toEqual({
      "1": { bottom: 1, id: 1, left: 0, right: 0, top: 0, topLeft: toPosition("A1") },
      "2": { bottom: 3, id: 2, left: 0, right: 0, top: 2, topLeft: toPosition("A3") },
    });
  });

  test("autofill with merge in target (1)", () => {
    const sheet1 = model.getters.getActiveSheetId();
    model.dispatch("ADD_MERGE", { sheetId: sheet1, zone: toZone("A3:A5") });
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "2");
    autofill("A1:A2", "A6");
    expect(Object.keys(getMergeCellMap(model))).toEqual([]);
    expect(getMerges(model)).toEqual({});
    expect(getCellContent(model, "A1")).toBe("1");
    expect(getCellContent(model, "A2")).toBe("2");
    expect(getCellContent(model, "A3")).toBe("3");
    expect(getCellContent(model, "A4")).toBe("4");
    expect(getCellContent(model, "A5")).toBe("5");
    expect(getCellContent(model, "A6")).toBe("6");
  });

  test("autofill with merge in target (2)", () => {
    const sheet1 = model.getters.getActiveSheetId();
    model.dispatch("ADD_MERGE", { sheetId: sheet1, zone: toZone("A2:B2") });
    setCellContent(model, "B1", "1");
    autofill("B1", "B2");
    expect(Object.keys(getMergeCellMap(model))).toEqual([]);
    expect(getMerges(model)).toEqual({});
    expect(getCellContent(model, "B1")).toBe("1");
    expect(getCellContent(model, "B2")).toBe("1");
  });

  test("Autofill cross-sheet references", () => {
    model.dispatch("CREATE_SHEET", { sheetId: "42", name: "Sheet2", position: 1 });
    setCellContent(model, "A1", "=Sheet2!A1");
    autofill("A1", "A3");
    expect(getCellText(model, "A2")).toBe("=Sheet2!A2");
    expect(getCellText(model, "A3")).toBe("=Sheet2!A3");
  });

  test("Autofill cross-sheet references with a space in the name", () => {
    model.dispatch("CREATE_SHEET", { sheetId: "42", name: "Sheet 2", position: 1 });
    setCellContent(model, "A1", "='Sheet 2'!A1");
    autofill("A1", "A3");
    expect(getCellText(model, "A2")).toBe("='Sheet 2'!A2");
    expect(getCellText(model, "A3")).toBe("='Sheet 2'!A3");
  });
});
