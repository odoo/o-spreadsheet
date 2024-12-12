import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_FONT,
  DEFAULT_FONT_SIZE,
  GRID_ICON_MARGIN,
  ICON_EDGE_LENGTH,
  NEWLINE,
  PADDING_AUTORESIZE_HORIZONTAL,
  PADDING_AUTORESIZE_VERTICAL,
} from "../../src/constants";
import { arg, functionRegistry } from "../../src/functions";
import { toScalar } from "../../src/functions/helper_matrices";
import { toString } from "../../src/functions/helpers";
import { fontSizeInPixels, toCartesian } from "../../src/helpers";
import { Model } from "../../src/model";
import { CommandResult, Format, SetDecimalStep, UID } from "../../src/types";
import {
  createSheet,
  createTableWithFilter,
  resizeColumns,
  resizeRows,
  selectCell,
  setAnchorCorner,
  setCellContent,
  setFormat,
  setStyle,
} from "../test_helpers/commands_helpers";
import {
  getCell,
  getCellContent,
  getEvaluatedCell,
  getEvaluatedGrid,
} from "../test_helpers/getters_helpers";
import { createModelFromGrid, target } from "../test_helpers/helpers";
import { addPivot } from "../test_helpers/pivot_helpers";

function setDecimal(model: Model, targetXc: string, step: SetDecimalStep) {
  model.dispatch("SET_DECIMAL", {
    sheetId: model.getters.getActiveSheetId(),
    target: target(targetXc),
    step: step,
  });
}

function setContextualFormat(model: Model, targetXc: string, format: Format) {
  model.dispatch("SET_FORMATTING_WITH_PIVOT", {
    sheetId: model.getters.getActiveSheetId(),
    target: target(targetXc),
    format,
  });
}

describe("formatting values (with formatters)", () => {
  test("can set a format to a cell", () => {
    const model = new Model();
    setCellContent(model, "A1", "3");
    expect(getCellContent(model, "A1")).toBe("3");
    setFormat(model, "A1", "0.00%");
    expect(getCell(model, "A1")!.format).toBe("0.00%");
    expect(getCellContent(model, "A1")).toBe("300.00%");
  });

  test("can set a date format to a cell containing a date", () => {
    const model = new Model();
    setCellContent(model, "A1", "3 14 2014");
    expect(getCellContent(model, "A1")).toBe("3 14 2014");
    setFormat(model, "A1", "mm/dd/yyyy");
    expect(getCell(model, "A1")!.format).toBe("mm/dd/yyyy");
    expect(getCellContent(model, "A1")).toBe("03/14/2014");
  });

  test("can set a date format to a cell containing a number", () => {
    const model = new Model();
    setCellContent(model, "A1", "1");
    expect(getCellContent(model, "A1")).toBe("1");
    setFormat(model, "A1", "mm/dd/yyyy");
    expect(getCell(model, "A1")!.format).toBe("mm/dd/yyyy");
    expect(getCellContent(model, "A1")).toBe("12/31/1899");
  });

  test("can set a number format to a cell containing a date", () => {
    const model = new Model();
    setCellContent(model, "A1", "1/1/2000");
    expect(getCellContent(model, "A1")).toBe("1/1/2000");
    setFormat(model, "A1", "0.00%");
    expect(getCell(model, "A1")!.format).toBe("0.00%");
    expect(getCellContent(model, "A1")).toBe("3652600.00%");
  });

  test("can set a format to an empty cell", () => {
    const model = new Model();
    selectCell(model, "A1");
    setFormat(model, "A1", "0.00%");
    expect(getCell(model, "A1")!.format).toBe("0.00%");
    expect(getCellContent(model, "A1")).toBe("");
    setCellContent(model, "A1", "0.431");
    expect(getCellContent(model, "A1")).toBe("43.10%");
  });

  test("can set the default format to a cell with value = 0", () => {
    const model = new Model();
    setCellContent(model, "A1", "0");
    setFormat(model, "A1", "");
    expect(getCell(model, "A1")!.format).not.toBeDefined();
    expect(getCellContent(model, "A1")).toBe("0");
  });

  test("can clear a format in a non empty cell", () => {
    const model = new Model();
    setCellContent(model, "A1", "3");
    setFormat(model, "A1", "0.00%");
    expect(getCell(model, "A1")!.format).toBeDefined();
    expect(getCellContent(model, "A1")).toBe("300.00%");
    setFormat(model, "A1", "");
    expect(getCellContent(model, "A1")).toBe("3");
    expect(getCell(model, "A1")!.format).not.toBeDefined();
  });

  test("can clear a format in an empty cell", () => {
    const model = new Model();
    setFormat(model, "A1", "0.00%");
    expect(getCell(model, "A1")!.format).toBe("0.00%");
    setFormat(model, "A1", "");
    expect(getCell(model, "A1")).toBeUndefined();
  });

  test("setting an empty format in an empty cell does nothing", () => {
    const model = new Model();
    setFormat(model, "A1", "");
    expect(getCell(model, "A1")).toBeUndefined();
  });

  test("does not format errors", () => {
    const model = new Model();
    setCellContent(model, "A1", "3");
    setFormat(model, "A1", "0.00%");
    expect(getCellContent(model, "A1")).toBe("300.00%");
    setCellContent(model, "A1", "=A1");
    expect(getCellContent(model, "A1")).toBe("#CYCLE");
  });

  test("Can set number format to text value", () => {
    const model = new Model();
    setCellContent(model, "A1", "Test");
    setFormat(model, "A1", "0.00%");
    expect(getCellContent(model, "A1")).toBe("Test");
  });

  test("Can set date format to text value", () => {
    const model = new Model();
    setCellContent(model, "A1", "Test");
    setFormat(model, "A1", "mm/dd/yyyy");
    expect(getCellContent(model, "A1")).toBe("Test");
  });

  test("Cannot set format in invalid sheet", () => {
    const model = new Model();
    expect(setFormat(model, "A1", "", "invalid sheet Id")).toBeCancelledBecause(
      CommandResult.InvalidSheetId
    );
  });

  test("SET_DECIMAL considers the evaluated format to infer the decimal position", () => {
    functionRegistry.add("SET.DYN.FORMAT", {
      description: "Returns the value set to the provided format",
      args: [arg("value (any)", "value to format"), arg("format (any)", "format to set.")],
      compute: function (value, format) {
        return {
          value: toScalar(value)?.value || 0,
          format: toString(toScalar(format)),
        };
      },
    });
    const model = new Model();
    setCellContent(model, "A1", '=SET.DYN.FORMAT(5, "0.00")');
    selectCell(model, "A1");
    setDecimal(model, "A1", 1);
    expect(getCell(model, "A1")?.format).toBe("0.000");
    functionRegistry.remove("SET.DYN.FORMAT");
  });

  test("SET_DECIMAL on long number that are truncated due to default format don't lose truncated digits", () => {
    const model = new Model();
    setCellContent(model, "A1", "10.123456789123");
    expect(getEvaluatedCell(model, "A1")?.formattedValue).toEqual("10.12345679");

    setDecimal(model, "A1", 1);
    expect(getCell(model, "A1")?.format).toBe("0." + "0".repeat(9));
    expect(getEvaluatedCell(model, "A1")?.formattedValue).toEqual("10.123456789");

    setDecimal(model, "A1", -1);
    expect(getCell(model, "A1")?.format).toBe("0." + "0".repeat(8));
    expect(getEvaluatedCell(model, "A1")?.formattedValue).toEqual("10.12345679");

    setDecimal(model, "A1", -1);
    expect(getCell(model, "A1")?.format).toBe("0." + "0".repeat(7));
    expect(getEvaluatedCell(model, "A1")?.formattedValue).toEqual("10.1234568");

    setDecimal(model, "A1", 1);
    expect(getCell(model, "A1")?.format).toBe("0." + "0".repeat(8));
    expect(getEvaluatedCell(model, "A1")?.formattedValue).toEqual("10.12345679");
  });

  test("SET_DECIMAL on format with escaped string", () => {
    const model = new Model();
    setCellContent(model, "A1", "10");

    setFormat(model, "A1", "0.0\\€");
    setDecimal(model, "A1", 1);
    expect(getCell(model, "A1")?.format).toBe("0.00\\€");

    setFormat(model, "A1", "0.0\\€");
    setDecimal(model, "A1", -1);
    expect(getCell(model, "A1")?.format).toBe("0\\€");

    setFormat(model, "A1", "0.0$0");
    setDecimal(model, "A1", -1);
    expect(getCell(model, "A1")?.format).toBe("0.0$");
    setDecimal(model, "A1", -1);
    expect(getCell(model, "A1")?.format).toBe("0$");
  });

  test("SET_DECIMAL on multi-part format", () => {
    const model = new Model();
    setCellContent(model, "A1", "10");

    setFormat(model, "A1", "0.0\\€;$0.#; 0 ;@");
    setDecimal(model, "A1", 1);
    expect(getCell(model, "A1")?.format).toBe("0.00\\€;$0.#0; 0.0 ;@");

    setFormat(model, "A1", "0.0\\€;$0.#; 0 ;@");
    setDecimal(model, "A1", -1);
    expect(getCell(model, "A1")?.format).toBe("0\\€;$0; 0 ;@");

    setFormat(model, "A1", ";;;@");
    setDecimal(model, "A1", -1);
    expect(getCell(model, "A1")?.format).toBe(";;;@");
  });

  test("UPDATE_CELL on long number that are truncated due to default format don't loose truncated digits", () => {
    const model = new Model();
    setCellContent(model, "A1", "10.123456789123");
    expect(getEvaluatedCell(model, "A1").value).toEqual(10.123456789123);

    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("UPDATE_CELL", {
      col: 0,
      row: 0,
      sheetId,
      style: { fillColor: "#555" },
      format: "[$$]#,##0.00",
    });
    expect(getEvaluatedCell(model, "A1").value).toEqual(10.123456789123);
  });
});

describe("pivot contextual formatting", () => {
  test("format without pivot", () => {
    const model = new Model();
    setContextualFormat(model, "A1", "0.00%");
    expect(getCell(model, "A1")?.format).toBe("0.00%");
  });

  test("format on a pivot measure value applies to the entire measure", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price",  C1: "=PIVOT(1)",
      A2: "Alice",    B2: "10",
      A3: "Bob",      B3: "12",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B3", {
      columns: [{ fieldName: "Customer" }],
      measures: [{ id: "Price", fieldName: "Price", aggregator: "sum" }],
    });
    setContextualFormat(model, "D3", "[$$]#,##0.00");
    expect(getCell(model, "D3")?.format).toBeUndefined();
    expect(getCell(model, "E3")?.format).toBeUndefined();
    expect(getCell(model, "F3")?.format).toBeUndefined();
    expect(getEvaluatedCell(model, "D3")?.format).toBe("[$$]#,##0.00");
    expect(getEvaluatedCell(model, "E3")?.format).toBe("[$$]#,##0.00");
    expect(getEvaluatedCell(model, "F3")?.format).toBe("[$$]#,##0.00");
    // prettier-ignore
    expect(getEvaluatedGrid(model, "C1:F3")).toEqual([
      ["(#1) Pivot", "Alice",   "Bob",    "Total"],
      ["",           "Price",   "Price",  "Price"],
      ["Total",      "$10.00",  "$12.00", "$22.00"],
    ]);
  });

  test("format on a pivot measure value applies to the selected measures", () => {
    const grid = {
      A1: "Price",
      A2: "10",
      A3: "=PIVOT(1)",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:A2", {
      measures: [
        { id: "Price:sum", fieldName: "Price", aggregator: "sum" },
        { id: "Price:avg", fieldName: "Price", aggregator: "avg", userDefinedName: "Price avg" },
      ],
    });

    setContextualFormat(model, "B5", "[$$]#,##0.00"); // only on the first measure
    // prettier-ignore
    expect(getEvaluatedGrid(model, "A3:C5")).toEqual([
      ["(#1) Pivot", "Total",   ""],
      ["",           "Price",   "Price avg"],
      ["Total",      "$10.00",  "10"],
    ]);

    setContextualFormat(model, "B5:C5", "[$€]#,##0.00"); // on both measures
    // prettier-ignore
    expect(getEvaluatedGrid(model, "A3:C5")).toEqual([
      ["(#1) Pivot", "Total",   ""],
      ["",           "Price",   "Price avg"],
      ["Total",      "€10.00",  "€10.00"],
    ]);
  });

  test("format on a pivot values overwrites user defined format", () => {
    const grid = {
      A1: "Price",
      A2: "10",
      A3: "=PIVOT(1)",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:A2", {
      measures: [{ id: "Price", fieldName: "Price", aggregator: "sum" }],
    });
    setFormat(model, "B5", "0.0%");
    setContextualFormat(model, "B5", "[$$]#,##0.00");
    expect(getCell(model, "B5")?.format).toBeUndefined();
    expect(getEvaluatedCell(model, "B5").formattedValue).toBe("$10.00");
  });

  test("format both pivot values and normal cells", () => {
    const grid = {
      A1: "Price",
      A2: "10",
      A3: "=PIVOT(1)",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:A2", {
      measures: [{ id: "Price", fieldName: "Price", aggregator: "sum" }],
    });
    setContextualFormat(model, "B5:B6", "[$$]#,##0.00");
    expect(getCell(model, "B5")?.format).toBeUndefined();
    expect(getCell(model, "B6")?.format).toBe("[$$]#,##0.00");
    expect(getEvaluatedCell(model, "B5")?.format).toBe("[$$]#,##0.00");
  });

  test("measure format takes precedence over aggregate format", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price",  C1: "=PIVOT(1)",
      A2: "Alice",    B2: "10",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B2", {
      rows: [{ fieldName: "Customer" }],
      measures: [{ id: "Price", fieldName: "Price", aggregator: "count" }],
    });
    setContextualFormat(model, "D3", "[$$]#,##0.00");
    // prettier-ignore
    expect(getEvaluatedGrid(model, "C1:D4")).toEqual([
      ["(#1) Pivot", "Total"],
      ["",           "Price"],
      ["Alice",      "$1.00"],
      ["Total",      "$1.00"],
    ]);
  });

  test("format is not applied on the measure with fixed pivot values", () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price",  C1: '=PIVOT.VALUE(1, "Price")',
      A2: "Alice",    B2: "10",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:B2", {
      rows: [{ fieldName: "Customer" }],
      measures: [{ id: "Price", fieldName: "Price", aggregator: "count" }],
    });
    setContextualFormat(model, "C1", "[$$]#,##0.00");
    expect(model.getters.getPivotCoreDefinition("1")?.measures[0].format).toBeUndefined();
    expect(getCell(model, "C1")?.format).toBe("[$$]#,##0.00");
  });
});

describe("formatting values (when change decimal)", () => {
  test("Can't change decimal format of a cell that isn't 'number' type", () => {
    const model = new Model();
    setCellContent(model, "A1", "kikou");
    expect(getCellContent(model, "A1")).toBe("kikou");
    selectCell(model, "A1");
    setDecimal(model, "A1", 1);
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
    setDecimal(model, "A1", 1);
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
      setFormat(model, "A1", oneDecimal);
      setDecimal(model, "A1", 1);
      expect(getCell(model, "A1")!.format).toBe(twoDecimal);

      setCellContent(model, "A2", "42");
      selectCell(model, "A2");
      setFormat(model, "A2", oneDecimal);
      setDecimal(model, "A2", -1);
      expect(getCell(model, "A2")!.format).toBe(noneDecimal);

      setCellContent(model, "A3", "42");
      selectCell(model, "A3");
      setFormat(model, "A3", noneDecimal);
      setDecimal(model, "A3", 1);
      expect(getCell(model, "A3")!.format).toBe(oneDecimal);

      setCellContent(model, "A4", "42");
      selectCell(model, "A4");
      setFormat(model, "A4", noneDecimal);
      setDecimal(model, "A4", -1);
      expect(getCell(model, "A4")!.format).toBe(noneDecimal);
    }
  );

  test("Can change decimal format of a cell that hasn't format (case 'number' type only)", () => {
    const model = new Model();

    setCellContent(model, "A1", "123");
    expect(getCell(model, "A1")!.format).toBe(undefined);
    selectCell(model, "A1");
    setDecimal(model, "A1", 1);
    expect(getCell(model, "A1")!.format).toBe("0.0");

    setCellContent(model, "A2", "456");
    expect(getCell(model, "A2")!.format).toBe(undefined);
    selectCell(model, "A2");
    setDecimal(model, "A2", -1);
    expect(getCell(model, "A2")!.format).toBe("0");

    setCellContent(model, "B1", "123.456");
    expect(getCell(model, "B1")!.format).toBe(undefined);
    selectCell(model, "B1");
    setDecimal(model, "B1", 1);
    expect(getCell(model, "B1")!.format).toBe("0.0000");

    setCellContent(model, "B2", "456.789");
    expect(getCell(model, "B2")!.format).toBe(undefined);
    selectCell(model, "B2");
    setDecimal(model, "B2", -1);
    expect(getCell(model, "B2")!.format).toBe("0.00");
  });

  test("Decimal format is limited to 20 zeros after the decimal point", () => {
    const model = new Model();

    const nineteenZerosA1 = "0.0000000000000000000";
    const twentyZerosA1 = "0.00000000000000000000";
    setCellContent(model, "A1", "123");
    setFormat(model, "A1", nineteenZerosA1);
    setDecimal(model, "A1", 1);
    setDecimal(model, "A1", 1);
    setDecimal(model, "A1", 1);
    expect(getCell(model, "A1")!.format).toBe(twentyZerosA1);

    const seventeenZerosB1 = "0.00000000000000000%";
    const twentyZerosB1 = "0.00000000000000000000%";
    setCellContent(model, "B1", "9%");
    setFormat(model, "B1", seventeenZerosB1);
    setDecimal(model, "B1", 1);
    setDecimal(model, "B1", 1);
    setDecimal(model, "B1", 1);
    setDecimal(model, "B1", 1);
    setDecimal(model, "B1", 1);
    setDecimal(model, "B1", 1);
    expect(getCell(model, "B1")!.format).toBe(twentyZerosB1);

    const eighteenZerosC1 = "#,##0.000000000000000000";
    const twentyZerosC1 = "#,##0.00000000000000000000";
    setCellContent(model, "C1", "3456.789");
    setFormat(model, "C1", eighteenZerosC1);
    setDecimal(model, "C1", 1);
    setDecimal(model, "C1", 1);
    setDecimal(model, "C1", 1);
    setDecimal(model, "C1", 1);
    expect(getCell(model, "C1")!.format).toBe(twentyZerosC1);
  });

  test("Change decimal format on a range does nothing if there isn't 'number' type", () => {
    const model = new Model();

    // give values ​​with different formats

    setCellContent(model, "A2", "Hey Jude");
    setFormat(model, "A2", "0.00%");
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

    setDecimal(model, "A1:C3", 1);

    expect(getCellContent(model, "A2")).toBe("Hey Jude");
    expect(getCellContent(model, "A3")).toBe("12/12/2012");
    expect(getCellContent(model, "C1")).toBe("LEBLEBI");

    expect(getCell(model, "A2")!.format).toBe("0.00%");
    expect(getCell(model, "A3")!.format).toBe("m/d/yyyy");
    expect(getCell(model, "C1")!.format).toBe(undefined);
  });

  test("Check multiple format in selected zone", async () => {
    let model = new Model();
    setCellContent(model, "A1", "100%");
    setCellContent(model, "B1", "$190.12");
    setCellContent(model, "C1", "$21");
    setDecimal(model, "A1:C1", 1);
    expect(getCellContent(model, "A1")).toEqual("100.0%");
    expect(getCellContent(model, "B1")).toEqual("$190.120");
    expect(getCellContent(model, "C1")).toEqual("$21.0");
  });

  test("Check multiple format in multiple zone", async () => {
    let model = new Model();
    setCellContent(model, "A1", "100%");
    setCellContent(model, "B1", "$190.12");
    setCellContent(model, "C1", "$21");
    setCellContent(model, "A3", "100%");
    setCellContent(model, "B3", "$190.12");
    setCellContent(model, "C3", "$21");
    setDecimal(model, "A1:C1", 1);
    setDecimal(model, "A3:C3", 1);
    expect(getCellContent(model, "A1")).toEqual("100.0%");
    expect(getCellContent(model, "B1")).toEqual("$190.120");
    expect(getCellContent(model, "C1")).toEqual("$21.0");
    expect(getCellContent(model, "A3")).toEqual("100.0%");
    expect(getCellContent(model, "B3")).toEqual("$190.120");
    expect(getCellContent(model, "C3")).toEqual("$21.0");
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
    ctx.font = `${fontSizeInPixels(DEFAULT_FONT_SIZE)}px ${DEFAULT_FONT}`;
    sizes = [TEXT, LONG_TEXT].map((text) => ctx.measureText(text).width);
  });

  test("Can autoresize a column", () => {
    setCellContent(model, "A1", TEXT);
    const initCellWidth = sizes[0] + hPadding;
    model.dispatch("AUTORESIZE_COLUMNS", { sheetId, cols: [0] });
    expect(model.getters.getColSize(sheetId, 0)).toBe(initCellWidth);
  });

  test("Can autoresize a column with multiline content", () => {
    const content = `Hello this is \nmultiline content for test`;
    setCellContent(model, "A1", content);
    model.dispatch("AUTORESIZE_COLUMNS", { sheetId, cols: [0] });
    const position = { sheetId, ...toCartesian("A1") };
    const style = model.getters.getCellComputedStyle(position);
    const multiLineText = content.split(NEWLINE);
    expect(model.getters.getColSize(sheetId, 0)).toBe(
      Math.max(...multiLineText.map((line) => model.getters.getTextWidth(line, style))) + hPadding
    );
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
    createTableWithFilter(model, "A1");
    model.dispatch("AUTORESIZE_COLUMNS", { sheetId, cols: [0] });
    expect(model.getters.getColSize(sheetId, 0)).toBe(
      sizes[0] + hPadding + ICON_EDGE_LENGTH + GRID_ICON_MARGIN
    );
  });

  test("Autoresize includes cells with only a filter icon", () => {
    createTableWithFilter(model, "A1");
    model.dispatch("AUTORESIZE_COLUMNS", { sheetId, cols: [0] });
    expect(model.getters.getColSize(sheetId, 0)).toBe(
      hPadding + ICON_EDGE_LENGTH + GRID_ICON_MARGIN
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
    setStyle(model, "A3", { fontSize: 24 });
    model.dispatch("AUTORESIZE_ROWS", { sheetId, rows: [0, 2] });
    expect(model.getters.getRowSize(sheetId, 0)).toBe(DEFAULT_CELL_HEIGHT);
    expect(model.getters.getRowSize(sheetId, 2)).toBe(fontSizeInPixels(24) + vPadding);
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

  test("row height does not take into account line breaks in the formula", async () => {
    const initialSize = model.getters.getRowSize(sheetId, 0);
    setCellContent(model, "A1", "=5\n\n-3\n\n-9");
    expect(getCellContent(model, "A1")).toEqual("-7");
    expect(model.getters.getRowSize(sheetId, 0)).toEqual(initialSize);
  });
});
