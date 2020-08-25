import { Model } from "../../src";
import { AutofillPlugin } from "../../src/plugins/autofill";
import { ConditionalFormat } from "../../src/types";
import { toZone, toCartesian } from "../../src/helpers";
import { DIRECTION } from "../../src/types/index";
import "../helpers"; // to have getcontext mocks
import { getCell } from "../helpers";

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

/**
 * Set a value to a cell
 */
function setValue(xc: string, text: string) {
  model.dispatch("SET_VALUE", { xc, text });
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
    ["1", "1"],
    ["test", "test"],
    ["=B1", "=B2"],
    ["01/01/2020", "01/01/2020"],
  ])("Autofill %s DOWN should give %s", (text, expected) => {
    setValue("A1", text);
    autofill("A1", "A2");
    expect(getCell(model, "A2")!.content).toBe(expected);
  });

  test("Autofill keep style, border and format", () => {
    model.dispatch("UPDATE_CELL", {
      col: 0,
      row: 0,
      sheet: model.getters.getActiveSheet(),
      style: 1,
      border: 2,
      format: "m/d/yyyy",
    });
    autofill("A1", "A2");
    const cell = getCell(model, "A2")!;
    expect(cell.style).toBe(1);
    expect(cell.border).toBe(2);
    expect(cell.format).toBe("m/d/yyyy");
  });

  test("Autofill add CF to target cell if present in origin cell", () => {
    model.dispatch("UPDATE_CELL", {
      col: 0,
      row: 0,
      sheet: model.getters.getActiveSheet(),
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
      sheet: model.getters.getActiveSheet(),
    });
    expect(model.getters.getConditionalStyle("A1")).toEqual({ fillColor: "#FF0000" });
    expect(model.getters.getConditionalStyle("A2")).toEqual({ fillColor: "#FF0000" });
    expect(model.getters.getConditionalStyle("A3")).toBeFalsy();
    expect(model.getters.getConditionalStyle("A4")).toBeFalsy();
    autofill("A1:A4", "A8");
    expect(model.getters.getConditionalStyle("A5")).toEqual({ fillColor: "#FF0000" });
    expect(model.getters.getConditionalStyle("A6")).toEqual({ fillColor: "#FF0000" });
    expect(model.getters.getConditionalStyle("A7")).toBeFalsy();
    expect(model.getters.getConditionalStyle("A8")).toBeFalsy();
  });

  describe("Autofill multiple values", () => {
    test("Autofill numbers", () => {
      setValue("A1", "1");
      setValue("A2", "2");
      autofill("A1:A2", "A6");
      expect(getCell(model, "A3")!.content).toBe("3");
      expect(getCell(model, "A4")!.content).toBe("4");
      expect(getCell(model, "A5")!.content).toBe("5");
      expect(getCell(model, "A6")!.content).toBe("6");
    });

    test("Autofill 2 non-consecutive numbers", () => {
      setValue("A1", "1");
      setValue("A2", "3");
      autofill("A1:A2", "A6");
      expect(getCell(model, "A3")!.content).toBe("5");
      expect(getCell(model, "A4")!.content).toBe("7");
      expect(getCell(model, "A5")!.content).toBe("9");
      expect(getCell(model, "A6")!.content).toBe("11");
    });

    test("Autofill more than 2 consecutive numbers", () => {
      setValue("A1", "1");
      setValue("A2", "3");
      setValue("A3", "5");
      autofill("A1:A3", "A6");
      expect(getCell(model, "A4")!.content).toBe("7");
      expect(getCell(model, "A5")!.content).toBe("9");
      expect(getCell(model, "A6")!.content).toBe("11");
    });

    test("Autofill non-trivial steps", () => {
      setValue("A1", "1");
      setValue("A2", "2");
      setValue("A3", "4");
      autofill("A1:A3", "A6");
      expect(getCell(model, "A4")!.content).toBe("5.5");
      expect(getCell(model, "A5")!.content).toBe("6.5");
      expect(getCell(model, "A6")!.content).toBe("8.5");
    });

    test("Autofill formulas", () => {
      setValue("A1", "=B1");
      setValue("A2", "=B2");
      autofill("A1:A2", "A6");
      expect(getCell(model, "A3")!.content).toBe("=B3");
      expect(getCell(model, "A4")!.content).toBe("=B4");
      expect(getCell(model, "A5")!.content).toBe("=B5");
      expect(getCell(model, "A6")!.content).toBe("=B6");
    });

    test("Autofill text values", () => {
      setValue("A1", "A");
      setValue("A2", "B");
      autofill("A1:A2", "A6");
      expect(getCell(model, "A3")!.content).toBe("A");
      expect(getCell(model, "A4")!.content).toBe("B");
      expect(getCell(model, "A5")!.content).toBe("A");
      expect(getCell(model, "A6")!.content).toBe("B");
    });

    test("Autofill mixed values", () => {
      setValue("A1", "1");
      setValue("A2", "2");
      setValue("A3", "test");
      autofill("A1:A3", "A9");
      expect(getCell(model, "A4")!.content).toBe("3");
      expect(getCell(model, "A5")!.content).toBe("4");
      expect(getCell(model, "A6")!.content).toBe("test");
      expect(getCell(model, "A7")!.content).toBe("5");
      expect(getCell(model, "A8")!.content).toBe("6");
      expect(getCell(model, "A9")!.content).toBe("test");
    });

    test("Autofill number and text", () => {
      setValue("A1", "1");
      setValue("A2", "test");
      autofill("A1:A2", "A4");
      expect(getCell(model, "A3")!.content).toBe("2");
      expect(getCell(model, "A4")!.content).toBe("test");
    });

    test("Autofill mixed-mixed values", () => {
      setValue("A1", "1");
      setValue("A2", "test");
      setValue("A3", "-1");
      setValue("A4", "-2");
      setValue("A5", "-3");
      autofill("A1:A5", "A10");
      expect(getCell(model, "A6")!.content).toBe("2");
      expect(getCell(model, "A7")!.content).toBe("test");
      expect(getCell(model, "A8")!.content).toBe("-4");
      expect(getCell(model, "A9")!.content).toBe("-5");
      expect(getCell(model, "A10")!.content).toBe("-6");
    });

    test("Autofill should override selected zone", () => {
      setValue("A1", "1");
      model.dispatch("UPDATE_CELL", {
        sheet: model.getters.getActiveSheet(),
        col: 0,
        row: 1,
        content: "test",
        style: 1,
        border: 1,
        format: "m/d/yyyy",
      });
      autofill("A1", "A2");
      const cell = getCell(model, "A2")!;
      expect(cell.style).toBeUndefined();
      expect(cell.border).toBeUndefined();
      expect(cell.format).toBeUndefined();
      expect(cell.content).toBe("1");
    });
  });

  test("Autofill functions", () => {
    setValue("A1", "=B1");
    autofill("A1", "A3"); // DOWN
    expect(getCell(model, "A2")!.content).toBe("=B2");
    expect(getCell(model, "A3")!.content).toBe("=B3");
    setValue("A1", "=A2");
    autofill("A1", "C1"); // RIGHT
    expect(getCell(model, "B1")!.content).toBe("=B2");
    expect(getCell(model, "C1")!.content).toBe("=C2");
    setValue("B2", "=C3");
    autofill("B2", "A2"); // LEFT
    expect(getCell(model, "A2")!.content).toBe("=B3");
    expect(getCell(model, "B2")!.content).toBe("=C3");
    autofill("B2", "B1"); // UP
    expect(getCell(model, "B1")!.content).toBe("=C2");
  });

  test("Autofill empty cell should erase others", () => {
    setValue("A2", "1");
    model.dispatch("UPDATE_CELL", {
      sheet: model.getters.getActiveSheet(),
      col: 0,
      row: 2,
      style: 1,
      border: 1,
      format: "m/d/yyyy",
    });
    autofill("A1", "A3");
    expect(getCell(model, "A2")).toBeNull();
    expect(getCell(model, "A3")).toBeNull();
  });

  test("Auto-autofill left", () => {
    setValue("A2", "1");
    setValue("A3", "1");
    setValue("A4", "1");
    setValue("B2", "2");
    selectZone("B2");
    model.dispatch("AUTOFILL_AUTO");
    expect(getCell(model, "B3")!.content).toBe("2");
    expect(getCell(model, "B4")!.content).toBe("2");
    expect(getCell(model, "B5")).toBeNull();
  });

  test("Auto-autofill right", () => {
    setValue("B2", "1");
    setValue("B3", "1");
    setValue("B4", "1");
    setValue("A2", "2");
    selectZone("A2");
    model.dispatch("AUTOFILL_AUTO");
    expect(getCell(model, "A3")!.content).toBe("2");
    expect(getCell(model, "A4")!.content).toBe("2");
    expect(getCell(model, "A5")).toBeNull();
  });

  test("autofill with merge in selection", () => {
    const sheet1 = model.getters.getActiveSheet();
    model.dispatch("ADD_MERGE", { sheet: sheet1, zone: toZone("A1:A2") });
    setValue("A1", "1");
    autofill("A1:A3", "A9");
    expect(Object.keys(model["workbook"].activeSheet.mergeCellMap)).toEqual([
      "A1",
      "A2",
      "A4",
      "A5",
      "A7",
      "A8",
    ]);
    expect(model["workbook"].activeSheet.merges).toEqual({
      "1": { bottom: 1, id: 1, left: 0, right: 0, top: 0, topLeft: "A1" },
      "2": { bottom: 4, id: 2, left: 0, right: 0, top: 3, topLeft: "A4" },
      "3": { bottom: 7, id: 3, left: 0, right: 0, top: 6, topLeft: "A7" },
    });
    expect(getCell(model, "A1")!.content).toBe("1");
    expect(getCell(model, "A4")!.content).toBe("2");
    expect(getCell(model, "A7")!.content).toBe("3");
  });

  test("autofill with merge in target (1)", () => {
    const sheet1 = model.getters.getActiveSheet();
    model.dispatch("ADD_MERGE", { sheet: sheet1, zone: toZone("A3:A5") });
    setValue("A1", "1");
    setValue("A2", "2");
    autofill("A1:A2", "A6");
    expect(Object.keys(model["workbook"].activeSheet.mergeCellMap)).toEqual([]);
    expect(model["workbook"].activeSheet.merges).toEqual({});
    expect(getCell(model, "A1")!.content).toBe("1");
    expect(getCell(model, "A2")!.content).toBe("2");
    expect(getCell(model, "A3")!.content).toBe("3");
    expect(getCell(model, "A4")!.content).toBe("4");
    expect(getCell(model, "A5")!.content).toBe("5");
    expect(getCell(model, "A6")!.content).toBe("6");
  });

  test("autofill with merge in target (2)", () => {
    const sheet1 = model.getters.getActiveSheet();
    model.dispatch("ADD_MERGE", { sheet: sheet1, zone: toZone("A2:B2") });
    setValue("B1", "1");
    autofill("B1", "B2");
    expect(Object.keys(model["workbook"].activeSheet.mergeCellMap)).toEqual([]);
    expect(model["workbook"].activeSheet.merges).toEqual({});
    expect(getCell(model, "B1")!.content).toBe("1");
    expect(getCell(model, "B2")!.content).toBe("1");
  });

  test("Autofill cross-sheet references", () => {
    model.dispatch("CREATE_SHEET", { id: "42", name: "Sheet2" });
    setValue("A1", "=Sheet2!A1");
    autofill("A1", "A3");
    expect(getCell(model, "A2")!.content).toBe("=Sheet2!A2");
    expect(getCell(model, "A3")!.content).toBe("=Sheet2!A3");
  });
});
