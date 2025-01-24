import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_FONT,
  DEFAULT_FONT_SIZE,
  FILTER_ICON_MARGIN,
  ICON_EDGE_LENGTH,
  PADDING_AUTORESIZE_HORIZONTAL,
  PADDING_AUTORESIZE_VERTICAL,
} from "../../src/constants";
import { fontSizeMap } from "../../src/fonts";
import { args, functionRegistry } from "../../src/functions";
import { toString } from "../../src/functions/helpers";
import { toZone } from "../../src/helpers";
import { Model } from "../../src/model";
import {
  Arg,
  ArgValue,
  CommandResult,
  ComputeFunction,
  Format,
  FunctionReturnValue,
  PrimitiveArg,
  PrimitiveArgValue,
  SetDecimalStep,
  UID,
} from "../../src/types";
import {
  createFilter,
  createSheet,
  resizeColumns,
  resizeRows,
  selectCell,
  setAnchorCorner,
  setCellContent,
  setFormat,
  setStyle,
} from "../test_helpers/commands_helpers";
import { getCell, getCellContent } from "../test_helpers/getters_helpers";
import { spyUiPluginHandle } from "../test_helpers/helpers";

function setDecimal(model: Model, step: SetDecimalStep) {
  model.dispatch("SET_DECIMAL", {
    sheetId: model.getters.getActiveSheetId(),
    target: model.getters.getSelectedZones(),
    step: step,
  });
}

describe("formatting values (with formatters)", () => {
  test("can set a format to a cell", () => {
    const model = new Model();
    setCellContent(model, "A1", "3");
    expect(getCellContent(model, "A1")).toBe("3");
    selectCell(model, "A1");
    setFormat(model, "0.00%");
    expect(getCell(model, "A1")!.format).toBe("0.00%");
    expect(getCellContent(model, "A1")).toBe("300.00%");
  });

  test("can set a date format to a cell containing a date", () => {
    const model = new Model();
    setCellContent(model, "A1", "3 14 2014");
    expect(getCellContent(model, "A1")).toBe("3 14 2014");
    selectCell(model, "A1");
    setFormat(model, "mm/dd/yyyy");
    expect(getCell(model, "A1")!.format).toBe("mm/dd/yyyy");
    expect(getCellContent(model, "A1")).toBe("03/14/2014");
  });

  test("can set a date format to a cell containing a number", () => {
    const model = new Model();
    setCellContent(model, "A1", "1");
    expect(getCellContent(model, "A1")).toBe("1");
    selectCell(model, "A1");
    setFormat(model, "mm/dd/yyyy");
    expect(getCell(model, "A1")!.format).toBe("mm/dd/yyyy");
    expect(getCellContent(model, "A1")).toBe("12/31/1899");
  });

  test("can set a number format to a cell containing a date", () => {
    const model = new Model();
    setCellContent(model, "A1", "1/1/2000");
    expect(getCellContent(model, "A1")).toBe("1/1/2000");
    selectCell(model, "A1");
    setFormat(model, "0.00%");
    expect(getCell(model, "A1")!.format).toBe("0.00%");
    expect(getCellContent(model, "A1")).toBe("3652600.00%");
  });

  test("can set a format to an empty cell", () => {
    const model = new Model();
    selectCell(model, "A1");
    setFormat(model, "0.00%");
    expect(getCell(model, "A1")!.format).toBe("0.00%");
    expect(getCellContent(model, "A1")).toBe("");
    setCellContent(model, "A1", "0.431");
    expect(getCellContent(model, "A1")).toBe("43.10%");
  });

  test("can set the default format to a cell with value = 0", () => {
    const model = new Model();
    setCellContent(model, "A1", "0");
    selectCell(model, "A1");
    setFormat(model, "");
    expect(getCell(model, "A1")!.format).not.toBeDefined();
    expect(getCellContent(model, "A1")).toBe("0");
  });

  test("can clear a format in a non empty cell", () => {
    const model = new Model();
    setCellContent(model, "A1", "3");
    selectCell(model, "A1");
    setFormat(model, "0.00%");
    expect(getCell(model, "A1")!.format).toBeDefined();
    expect(getCellContent(model, "A1")).toBe("300.00%");
    setFormat(model, "");
    expect(getCellContent(model, "A1")).toBe("3");
    expect(getCell(model, "A1")!.format).not.toBeDefined();
  });

  test("can clear a format in an empty cell", () => {
    const model = new Model();
    selectCell(model, "A1");
    setFormat(model, "0.00%");
    expect(getCell(model, "A1")!.format).toBe("0.00%");
    setFormat(model, "");
    expect(getCell(model, "A1")).toBeUndefined();
  });

  test("setting an empty format in an empty cell does nothing", () => {
    const model = new Model();
    selectCell(model, "A1");
    setFormat(model, "");
    expect(getCell(model, "A1")).toBeUndefined();
  });

  test("does not format errors", () => {
    const model = new Model();
    setCellContent(model, "A1", "3");
    selectCell(model, "A1");
    setFormat(model, "0.00%");
    expect(getCellContent(model, "A1")).toBe("300.00%");
    setCellContent(model, "A1", "=A1");
    expect(getCellContent(model, "A1")).toBe("#CYCLE");
  });

  test("Can set number format to text value", () => {
    const model = new Model();
    setCellContent(model, "A1", "Test");
    selectCell(model, "A1");
    setFormat(model, "0.00%");
    expect(getCellContent(model, "A1")).toBe("Test");
  });

  test("Can set date format to text value", () => {
    const model = new Model();
    setCellContent(model, "A1", "Test");
    selectCell(model, "A1");
    setFormat(model, "mm/dd/yyyy");
    expect(getCellContent(model, "A1")).toBe("Test");
  });

  test("Cannot set format in invalid sheet", () => {
    const model = new Model();
    expect(
      model.dispatch("SET_FORMATTING", {
        sheetId: "invalid sheet Id",
        target: [toZone("A1")],
      })
    ).toBeCancelledBecause(CommandResult.InvalidSheetId);
  });

  test("SET_DECIMAL considers the evaluated format to infer the decimal position", () => {
    functionRegistry.add("SET.DYN.FORMAT", {
      description: "Returns the value set to the provided format",
      args: args(`
          value (any) "value to format",
          format (any) "format to set."
      `),
      compute: function (value: PrimitiveArgValue, format: PrimitiveArgValue) {
        return value || 0;
      } as ComputeFunction<ArgValue, FunctionReturnValue>,
      computeFormat: function (value: PrimitiveArg, format: PrimitiveArg) {
        return toString(format.value);
      } as ComputeFunction<Arg, Format>,
      returns: ["ANY"],
    });
    const model = new Model();
    setCellContent(model, "A1", '=SET.DYN.FORMAT(5, "0.00")');
    selectCell(model, "A1");
    setDecimal(model, 1);
    expect(getCell(model, "A1")?.format).toBe("0.000");
    functionRegistry.remove("SET.DYN.FORMAT");
  });
});

describe("formatting values (when change decimal)", () => {
  test("Can't change decimal format of a cell that isn't 'number' type", () => {
    const model = new Model();
    setCellContent(model, "A1", "kikou");
    expect(getCellContent(model, "A1")).toBe("kikou");
    selectCell(model, "A1");
    setDecimal(model, 1);
    expect(getCell(model, "A1")!.format).toBe(undefined);
    expect(getCellContent(model, "A1")).toBe("kikou");
  });

  test("Can't change decimal format of a cell when value not exist", () => {
    const model = new Model();
    setCellContent(model, "A1", "42%");
    selectCell(model, "A1");
    model.dispatch("DELETE_CONTENT", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
    });
    expect(getCell(model, "A1")!.format).toBe("0%");
    setDecimal(model, 1);
    expect(getCell(model, "A1")!.format).toBe("0%");
  });

  test.each([
    ["0%", "0.0%", "0.00%"],
    ["#,##0", "#,##0.0", "#,##0.00"],

    ["#,##0[$ THUNE ]", "#,##0.0[$ THUNE ]", "#,##0.00[$ THUNE ]"],
    ["[$ THUNE ]#,##0", "[$ THUNE ]#,##0.0", "[$ THUNE ]#,##0.00"],

    ["#,##0[$ #,##0.00 ]", "#,##0.0[$ #,##0.00 ]", "#,##0.00[$ #,##0.00 ]"],
    ["[$ #,##0.00 ]#,##0", "[$ #,##0.00 ]#,##0.0", "[$ #,##0.00 ]#,##0.00"],
  ])(
    "Can change decimal format of a cell that already has format",
    (noneDecimal, oneDecimal, twoDecimal) => {
      const model = new Model();

      setCellContent(model, "A1", "42");
      selectCell(model, "A1");
      setFormat(model, oneDecimal);
      setDecimal(model, 1);
      expect(getCell(model, "A1")!.format).toBe(twoDecimal);

      setCellContent(model, "A2", "42");
      selectCell(model, "A2");
      setFormat(model, oneDecimal);
      setDecimal(model, -1);
      expect(getCell(model, "A2")!.format).toBe(noneDecimal);

      setCellContent(model, "A3", "42");
      selectCell(model, "A3");
      setFormat(model, noneDecimal);
      setDecimal(model, 1);
      expect(getCell(model, "A3")!.format).toBe(oneDecimal);

      setCellContent(model, "A4", "42");
      selectCell(model, "A4");
      setFormat(model, noneDecimal);
      setDecimal(model, -1);
      expect(getCell(model, "A4")!.format).toBe(noneDecimal);
    }
  );

  test("Can change decimal format of a cell that hasn't format (case 'number' type only)", () => {
    const model = new Model();

    setCellContent(model, "A1", "123");
    expect(getCell(model, "A1")!.format).toBe(undefined);
    selectCell(model, "A1");
    setDecimal(model, 1);
    expect(getCell(model, "A1")!.format).toBe("0.0");

    setCellContent(model, "A2", "456");
    expect(getCell(model, "A2")!.format).toBe(undefined);
    selectCell(model, "A2");
    setDecimal(model, -1);
    expect(getCell(model, "A2")!.format).toBe("0");

    setCellContent(model, "B1", "123.456");
    expect(getCell(model, "B1")!.format).toBe(undefined);
    selectCell(model, "B1");
    setDecimal(model, 1);
    expect(getCell(model, "B1")!.format).toBe("0.0000");

    setCellContent(model, "B2", "456.789");
    expect(getCell(model, "B2")!.format).toBe(undefined);
    selectCell(model, "B2");
    setDecimal(model, -1);
    expect(getCell(model, "B2")!.format).toBe("0.00");
  });

  test("Decimal format is limited to 20 zeros after the decimal point", () => {
    const model = new Model();

    const nineteenZerosA1 = "0.0000000000000000000";
    const twentyZerosA1 = "0.00000000000000000000";
    setCellContent(model, "A1", "123");
    selectCell(model, "A1");
    setFormat(model, nineteenZerosA1);
    setDecimal(model, 1);
    setDecimal(model, 1);
    setDecimal(model, 1);
    expect(getCell(model, "A1")!.format).toBe(twentyZerosA1);

    const seventeenZerosB1 = "0.00000000000000000%";
    const twentyZerosB1 = "0.00000000000000000000%";
    setCellContent(model, "B1", "9%");
    selectCell(model, "B1");
    setFormat(model, seventeenZerosB1);
    setDecimal(model, 1);
    setDecimal(model, 1);
    setDecimal(model, 1);
    setDecimal(model, 1);
    setDecimal(model, 1);
    setDecimal(model, 1);
    expect(getCell(model, "B1")!.format).toBe(twentyZerosB1);

    const eighteenZerosC1 = "#,##0.000000000000000000";
    const twentyZerosC1 = "#,##0.00000000000000000000";
    setCellContent(model, "C1", "3456.789");
    selectCell(model, "C1");
    setFormat(model, eighteenZerosC1);
    setDecimal(model, 1);
    setDecimal(model, 1);
    setDecimal(model, 1);
    setDecimal(model, 1);
    expect(getCell(model, "C1")!.format).toBe(twentyZerosC1);
  });

  test("Change decimal format on a range gives the same format for all cells", () => {
    const model = new Model();

    // give values ​​with different formats

    setCellContent(model, "A2", "9");
    selectCell(model, "A2");
    setFormat(model, "0.00%");
    expect(getCellContent(model, "A2")).toBe("900.00%");

    setCellContent(model, "A3", "4567.8");
    selectCell(model, "A3");
    setFormat(model, "#,##0");
    expect(getCellContent(model, "A3")).toBe("4,568");

    setCellContent(model, "C1", "42.42");
    selectCell(model, "C1");
    setFormat(model, "0.000");
    expect(getCellContent(model, "C1")).toBe("42.420");

    // select A1, then expand selection to A1:C3

    selectCell(model, "A1");

    setAnchorCorner(model, "C3");

    // increase decimalFormat on the selection

    setDecimal(model, 1);

    expect(getCellContent(model, "A2")).toBe("9.0000");
    expect(getCellContent(model, "A3")).toBe("4567.8000");
    expect(getCellContent(model, "C1")).toBe("42.4200");

    expect(getCell(model, "A1")!.format).toBe("0.0000");
    expect(getCell(model, "A2")!.format).toBe("0.0000");
    expect(getCell(model, "A3")!.format).toBe("0.0000");
    expect(getCell(model, "B1")!.format).toBe("0.0000");
    expect(getCell(model, "B2")!.format).toBe("0.0000");
    expect(getCell(model, "B3")!.format).toBe("0.0000");
    expect(getCell(model, "C1")!.format).toBe("0.0000");
    expect(getCell(model, "C2")!.format).toBe("0.0000");
    expect(getCell(model, "C3")!.format).toBe("0.0000");
  });

  test("Change decimal format on a range does nothing if there isn't 'number' type", () => {
    const model = new Model();

    // give values ​​with different formats

    setCellContent(model, "A2", "Hey Jude");
    selectCell(model, "A2");
    setFormat(model, "0.00%");
    expect(getCellContent(model, "A2")).toBe("Hey Jude");

    setCellContent(model, "A3", "12/12/2012");
    selectCell(model, "A3");
    expect(getCellContent(model, "A3")).toBe("12/12/2012");

    setCellContent(model, "C1", "LEBLEBI");
    expect(getCellContent(model, "C1")).toBe("LEBLEBI");

    // select A1, then expand selection to A1:C3
    selectCell(model, "A1");

    setAnchorCorner(model, "C3");

    // increase decimalFormat on the selection

    setDecimal(model, 1);

    expect(getCellContent(model, "A2")).toBe("Hey Jude");
    expect(getCellContent(model, "A3")).toBe("12/12/2012");
    expect(getCellContent(model, "C1")).toBe("LEBLEBI");

    expect(getCell(model, "A2")!.format).toBe("0.00%");
    expect(getCell(model, "A3")!.format).toBe("m/d/yyyy");
    expect(getCell(model, "C1")!.format).toBe(undefined);
  });
});

describe("Autoresize", () => {
  let model: Model;
  let sheetId: UID;
  const TEXT = "text";
  const LONG_TEXT = "longText";
  let sizes: number[];
  const hPadding = 2 * PADDING_AUTORESIZE_HORIZONTAL;
  const vPadding = 2 * PADDING_AUTORESIZE_VERTICAL;

  beforeEach(() => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
    const ctx = document.createElement("canvas").getContext("2d")!;
    ctx.font = `${fontSizeMap[DEFAULT_FONT_SIZE]}px ${DEFAULT_FONT}`;
    sizes = [TEXT, LONG_TEXT].map((text) => ctx.measureText(text).width);
  });

  test("Can autoresize a column", () => {
    setCellContent(model, "A1", TEXT);
    const initCellWidth = sizes[0] + hPadding;
    model.dispatch("AUTORESIZE_COLUMNS", { sheetId, cols: [0] });
    expect(model.getters.getColSize(sheetId, 0)).toBe(initCellWidth);
  });

  test("Can autoresize a column with text width smaller than cell width", () => {
    setCellContent(model, "A1", TEXT);
    const initCellWidth = sizes[0] + hPadding;
    const newCellWidth = initCellWidth * 2;
    resizeColumns(model, ["A"], newCellWidth);
    expect(model.getters.getColSize(sheetId, 0)).toBe(newCellWidth);
    model.dispatch("AUTORESIZE_COLUMNS", { sheetId, cols: [0] });
    expect(model.getters.getColSize(sheetId, 0)).toBe(initCellWidth);
  });

  test("Can autoresize a column with text width smaller than cell width, and cell in wrap mode", () => {
    setCellContent(model, "A1", TEXT);
    const initCellWidth = sizes[0] + hPadding;
    const newCellWidth = initCellWidth * 2;
    resizeColumns(model, ["A"], newCellWidth);
    setStyle(model, "A1", { wrapping: "wrap" });
    expect(model.getters.getColSize(sheetId, 0)).toBe(newCellWidth);
    model.dispatch("AUTORESIZE_COLUMNS", { sheetId, cols: [0] });
    expect(model.getters.getColSize(sheetId, 0)).toBe(initCellWidth);
  });

  test("Can autoresize a column with text width greater than cell width", () => {
    setCellContent(model, "A1", LONG_TEXT);
    const initCellWidth = sizes[1] + hPadding;
    const newCellWidth = initCellWidth / 2;
    resizeColumns(model, ["A"], newCellWidth);
    expect(model.getters.getColSize(sheetId, 0)).toBe(newCellWidth);
    model.dispatch("AUTORESIZE_COLUMNS", { sheetId, cols: [0] });
    expect(model.getters.getColSize(sheetId, 0)).toBe(initCellWidth);
  });

  test("Can't autoresize a column with text width greater than cell width, and cell in wrap mode", () => {
    setCellContent(model, "A1", "size0");
    const initCellWidth = sizes[0] + hPadding;
    const newCellWidth = initCellWidth / 2;
    resizeColumns(model, ["A"], newCellWidth);
    setStyle(model, "A1", { wrapping: "wrap" });
    expect(model.getters.getColSize(sheetId, 0)).toBe(newCellWidth);
    model.dispatch("AUTORESIZE_COLUMNS", { sheetId, cols: [0] });
    expect(model.getters.getColSize(sheetId, 0)).toBe(newCellWidth);
  });

  test("Can autoresize two columns", () => {
    setCellContent(model, "A1", TEXT);
    setCellContent(model, "C1", LONG_TEXT);
    model.dispatch("AUTORESIZE_COLUMNS", { sheetId, cols: [0, 2] });
    expect(model.getters.getColSize(sheetId, 0)).toBe(sizes[0] + hPadding);
    expect(model.getters.getColSize(sheetId, 2)).toBe(sizes[1] + hPadding);
  });

  test("Autoresize includes filter icon to compute the size", () => {
    setCellContent(model, "A1", TEXT);
    createFilter(model, "A1");
    model.dispatch("AUTORESIZE_COLUMNS", { sheetId, cols: [0] });
    expect(model.getters.getColSize(sheetId, 0)).toBe(
      sizes[0] + hPadding + ICON_EDGE_LENGTH + FILTER_ICON_MARGIN
    );
  });

  test("Autoresize includes cells with only a filter icon", () => {
    createFilter(model, "A1");
    model.dispatch("AUTORESIZE_COLUMNS", { sheetId, cols: [0] });
    expect(model.getters.getColSize(sheetId, 0)).toBe(
      hPadding + ICON_EDGE_LENGTH + FILTER_ICON_MARGIN
    );
  });

  test("Can autoresize a row", () => {
    resizeRows(model, [0], DEFAULT_CELL_HEIGHT + 42);
    setCellContent(model, "A1", "test");
    model.dispatch("AUTORESIZE_ROWS", { sheetId, rows: [0] });
    expect(model.getters.getRowSize(sheetId, 0)).toBe(DEFAULT_CELL_HEIGHT);
  });

  test("Can autoresize two rows", () => {
    resizeRows(model, [0, 2], DEFAULT_CELL_HEIGHT + 30);
    setCellContent(model, "A1", "test");
    setCellContent(model, "A3", "test");
    model.dispatch("SET_FORMATTING", { sheetId, target: [toZone("A3")], style: { fontSize: 24 } });
    model.dispatch("AUTORESIZE_ROWS", { sheetId, rows: [0, 2] });
    expect(model.getters.getRowSize(sheetId, 0)).toBe(DEFAULT_CELL_HEIGHT);
    expect(model.getters.getRowSize(sheetId, 2)).toBe(fontSizeMap[24] + vPadding);
  });

  test("Only a single resize command is dispatched when auto-resizing multiple rows", () => {
    const rows = [0, 1, 2];
    resizeRows(model, rows, DEFAULT_CELL_HEIGHT + 30);
    const handleCmd = spyUiPluginHandle(model);
    model.dispatch("AUTORESIZE_ROWS", { sheetId, rows: [0, 1, 2] });
    expect(handleCmd).toHaveBeenCalledTimes(2);
    expect(handleCmd).toHaveBeenNthCalledWith(1, { type: "AUTORESIZE_ROWS", sheetId, rows });
    expect(handleCmd).toHaveBeenNthCalledWith(2, {
      type: "RESIZE_COLUMNS_ROWS",
      elements: rows,
      dimension: "ROW",
      size: null,
      sheetId,
    });
  });

  test("Can autoresize a column in another sheet", () => {
    const initialSize = model.getters.getColSize(sheetId, 0);
    const newSheetId = "42";
    createSheet(model, { sheetId: newSheetId });
    setCellContent(model, "A1", TEXT, newSheetId);
    model.dispatch("AUTORESIZE_COLUMNS", { sheetId: newSheetId, cols: [0] });
    expect(model.getters.getColSize(sheetId, 0)).toBe(initialSize);
    expect(model.getters.getColSize(newSheetId, 0)).toBe(sizes[0] + hPadding);
  });

  test("Can autoresize a row in another sheet", () => {
    const initialSize = model.getters.getRowSize(sheetId, 0);
    const newSheetId = "42";
    createSheet(model, { sheetId: newSheetId });
    resizeRows(model, [0], DEFAULT_CELL_HEIGHT + 30, "42");
    setCellContent(model, "A1", "test", newSheetId);
    model.dispatch("AUTORESIZE_ROWS", { sheetId: newSheetId, rows: [0] });
    expect(model.getters.getRowSize(sheetId, 0)).toBe(initialSize);
    expect(model.getters.getRowSize(newSheetId, 0)).toBe(DEFAULT_CELL_HEIGHT);
  });

  test("Autoresizing empty cols has no effect", () => {
    const initialSize = model.getters.getColSize(sheetId, 0);
    model.dispatch("AUTORESIZE_COLUMNS", { sheetId, cols: [0] });
    expect(model.getters.getColSize(sheetId, 0)).toBe(initialSize);
    setCellContent(model, "A1", '=""');
    model.dispatch("AUTORESIZE_COLUMNS", { sheetId, cols: [0] });
    expect(model.getters.getColSize(sheetId, 0)).toBe(initialSize);
  });
});
