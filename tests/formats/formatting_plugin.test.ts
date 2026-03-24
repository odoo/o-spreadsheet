import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  DEFAULT_FONT,
  DEFAULT_FONT_SIZE,
  GRID_ICON_EDGE_LENGTH,
  GRID_ICON_MARGIN,
  MIN_CELL_TEXT_MARGIN,
  NEWLINE,
  PADDING_AUTORESIZE_HORIZONTAL,
  PADDING_AUTORESIZE_VERTICAL,
} from "@odoo/o-spreadsheet-engine/constants";
import { arg } from "@odoo/o-spreadsheet-engine/functions/arguments";
import { functionRegistry } from "@odoo/o-spreadsheet-engine/functions/function_registry";
import { toScalar } from "@odoo/o-spreadsheet-engine/functions/helper_matrices";
import { toString } from "@odoo/o-spreadsheet-engine/functions/helpers";
import { Model } from "@odoo/o-spreadsheet-engine/model";
import { fontSizeInPixels, getCellContentHeight, toCartesian } from "../../src/helpers";
import { CommandResult, Format, UID } from "../../src/types";
import {
  autoresizeColumns,
  autoresizeRows,
  createSheet,
  createTableWithFilter,
  deleteContent,
  resizeColumns,
  resizeRows,
  selectCell,
  setAnchorCorner,
  setCellContent,
  setDecimal,
  setFormat,
  setFormatting,
  updateCell,
} from "../test_helpers/commands_helpers";
import {
  getCell,
  getCellContent,
  getEvaluatedCell,
  getEvaluatedGrid,
} from "../test_helpers/getters_helpers";
import {
  addToRegistry,
  createModel,
  createModelFromGrid,
  getNode,
  makeTestEnv,
  spyUiPluginHandle,
  target,
} from "../test_helpers/helpers";
import { addPivot } from "../test_helpers/pivot_helpers";

function setContextualFormat(model: Model, targetXc: string, format: Format) {
  model.dispatch("SET_FORMATTING_WITH_PIVOT", {
    sheetId: model.getters.getActiveSheetId(),
    target: target(targetXc),
    format,
  });
}

describe("formatting values (with formatters)", () => {
  test("can set a format to a cell", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "3");
    expect(getCellContent(model, "A1")).toBe("3");
    await setFormat(model, "A1", "0.00%");
    expect(getCell(model, "A1")!.format).toBe("0.00%");
    expect(getCellContent(model, "A1")).toBe("300.00%");
  });

  test("can set a date format to a cell containing a date", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "3 14 2014");
    expect(getCellContent(model, "A1")).toBe("3 14 2014");
    await setFormat(model, "A1", "mm/dd/yyyy");
    expect(getCell(model, "A1")!.format).toBe("mm/dd/yyyy");
    expect(getCellContent(model, "A1")).toBe("03/14/2014");
  });

  test("can set a date format to a cell containing a number", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "1");
    expect(getCellContent(model, "A1")).toBe("1");
    await setFormat(model, "A1", "mm/dd/yyyy");
    expect(getCell(model, "A1")!.format).toBe("mm/dd/yyyy");
    expect(getCellContent(model, "A1")).toBe("12/31/1899");
  });

  test("can set a number format to a cell containing a date", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "1/1/2000");
    expect(getCellContent(model, "A1")).toBe("1/1/2000");
    await setFormat(model, "A1", "0.00%");
    expect(getCell(model, "A1")!.format).toBe("0.00%");
    expect(getCellContent(model, "A1")).toBe("3652600.00%");
  });

  test("can set a format to an empty cell", async () => {
    const model = await createModel();
    await selectCell(model, "A1");
    await setFormat(model, "A1", "0.00%");
    expect(getCell(model, "A1")!.format).toBe("0.00%");
    expect(getCellContent(model, "A1")).toBe("");
    await setCellContent(model, "A1", "0.431");
    expect(getCellContent(model, "A1")).toBe("43.10%");
  });

  test("can set the default format to a cell with value = 0", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "0");
    await setFormat(model, "A1", "");
    expect(getCell(model, "A1")!.format).not.toBeDefined();
    expect(getCellContent(model, "A1")).toBe("0");
  });

  test("can clear a format in a non empty cell", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "3");
    await setFormat(model, "A1", "0.00%");
    expect(getCell(model, "A1")!.format).toBeDefined();
    expect(getCellContent(model, "A1")).toBe("300.00%");
    await setFormat(model, "A1", "");
    expect(getCellContent(model, "A1")).toBe("3");
    expect(getCell(model, "A1")!.format).not.toBeDefined();
  });

  test("can clear a format in an empty cell", async () => {
    const model = await createModel();
    await setFormat(model, "A1", "0.00%");
    expect(getCell(model, "A1")!.format).toBe("0.00%");
    await setFormat(model, "A1", "");
    expect(getCell(model, "A1")).toBeUndefined();
  });

  test("setting an empty format in an empty cell does nothing", async () => {
    const model = await createModel();
    await setFormat(model, "A1", "");
    expect(getCell(model, "A1")).toBeUndefined();
  });

  test("does not format errors", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "3");
    await setFormat(model, "A1", "0.00%");
    expect(getCellContent(model, "A1")).toBe("300.00%");
    await setCellContent(model, "A1", "=A1");
    expect(getCellContent(model, "A1")).toBe("#CYCLE");
  });

  test("Can set number format to text value", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "Test");
    await setFormat(model, "A1", "0.00%");
    expect(getCellContent(model, "A1")).toBe("Test");
  });

  test("Can set date format to text value", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "Test");
    await setFormat(model, "A1", "mm/dd/yyyy");
    expect(getCellContent(model, "A1")).toBe("Test");
  });

  test("Cannot set format in invalid sheet", async () => {
    const model = await createModel();
    expect(await setFormat(model, "A1", "", "invalid sheet Id")).toBeCancelledBecause(
      CommandResult.InvalidSheetId
    );
  });

  test("SET_DECIMAL considers the evaluated format to infer the decimal position", async () => {
    addToRegistry(functionRegistry, "SET.DYN.FORMAT", {
      description: "Returns the value set to the provided format",
      args: [arg("value (any)", "value to format"), arg("format (any)", "format to set.")],
      compute: function (value, format) {
        return {
          value: toScalar(value)?.value || 0,
          format: toString(toScalar(format)),
        };
      },
    });
    const model = await createModel();
    await setCellContent(model, "A1", '=SET.DYN.FORMAT(5, "0.00")');
    await selectCell(model, "A1");
    await setDecimal(model, "A1", 1);
    expect(getCell(model, "A1")?.format).toBe("0.000");
  });

  test("SET_DECIMAL on long number that are truncated due to default format don't lose truncated digits", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "10.123456789123");
    expect(getEvaluatedCell(model, "A1")?.formattedValue).toEqual("10.12345679");

    await setDecimal(model, "A1", 1);
    expect(getCell(model, "A1")?.format).toBe("0." + "0".repeat(9));
    expect(getEvaluatedCell(model, "A1")?.formattedValue).toEqual("10.123456789");

    await setDecimal(model, "A1", -1);
    expect(getCell(model, "A1")?.format).toBe("0." + "0".repeat(8));
    expect(getEvaluatedCell(model, "A1")?.formattedValue).toEqual("10.12345679");

    await setDecimal(model, "A1", -1);
    expect(getCell(model, "A1")?.format).toBe("0." + "0".repeat(7));
    expect(getEvaluatedCell(model, "A1")?.formattedValue).toEqual("10.1234568");

    await setDecimal(model, "A1", 1);
    expect(getCell(model, "A1")?.format).toBe("0." + "0".repeat(8));
    expect(getEvaluatedCell(model, "A1")?.formattedValue).toEqual("10.12345679");
  });

  test("SET_DECIMAL on format with escaped string", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "10");

    await setFormat(model, "A1", "0.0\\€");
    await setDecimal(model, "A1", 1);
    expect(getCell(model, "A1")?.format).toBe("0.00\\€");

    await setFormat(model, "A1", "0.0\\€");
    await setDecimal(model, "A1", -1);
    expect(getCell(model, "A1")?.format).toBe("0\\€");

    await setFormat(model, "A1", "0.0$0");
    await setDecimal(model, "A1", -1);
    expect(getCell(model, "A1")?.format).toBe("0.0$");
    await setDecimal(model, "A1", -1);
    expect(getCell(model, "A1")?.format).toBe("0$");
  });

  test("SET_DECIMAL on multi-part format", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "10");

    await setFormat(model, "A1", "0.0\\€;$0.#; 0 ;@");
    await setDecimal(model, "A1", 1);
    expect(getCell(model, "A1")?.format).toBe("0.00\\€;$0.#0; 0.0 ;@");

    await setFormat(model, "A1", "0.0\\€;$0.#; 0 ;@");
    await setDecimal(model, "A1", -1);
    expect(getCell(model, "A1")?.format).toBe("0\\€;$0; 0 ;@");

    await setFormat(model, "A1", ";;;@");
    await setDecimal(model, "A1", -1);
    expect(getCell(model, "A1")?.format).toBe(";;;@");
  });

  test("SET_DECIMAL on scientific format", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "1234");

    await setFormat(model, "A1", "0.00e");
    await setDecimal(model, "A1", 1);
    expect(getCell(model, "A1")?.format).toBe("0.000e");
    expect(getEvaluatedCell(model, "A1").formattedValue).toBe("1.234e+03");

    await setDecimal(model, "A1", -1);
    await setDecimal(model, "A1", -1);
    expect(getCell(model, "A1")?.format).toBe("0.0e");
    expect(getEvaluatedCell(model, "A1").formattedValue).toBe("1.2e+03");
  });

  test("UPDATE_CELL on long number that are truncated due to default format don't loose truncated digits", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "10.123456789123");
    expect(getEvaluatedCell(model, "A1").value).toEqual(10.123456789123);

    await updateCell(model, "A1", { style: { fillColor: "#555" }, format: "[$$]#,##0.00" });
    expect(getEvaluatedCell(model, "A1").value).toEqual(10.123456789123);
  });
});

describe("pivot contextual formatting", () => {
  test("format without pivot", async () => {
    const model = await createModel();
    setContextualFormat(model, "A1", "0.00%");
    expect(getCell(model, "A1")?.format).toBe("0.00%");
  });

  test("format on a pivot measure value applies to the entire measure", async () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price",  C1: "=PIVOT(1)",
      A2: "Alice",    B2: "10",
      A3: "Bob",      B3: "12",
    };
    const model = await createModelFromGrid(grid);
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
      ["Pivot",      "Alice",   "Bob",    "Total"],
      ["",           "Price",   "Price",  "Price"],
      ["Total",      "$10.00",  "$12.00", "$22.00"],
    ]);
  });

  test("format on a pivot measure value applies to the selected measures", async () => {
    const grid = {
      A1: "Price",
      A2: "10",
      A3: "=PIVOT(1)",
    };
    const model = await createModelFromGrid(grid);
    addPivot(model, "A1:A2", {
      measures: [
        { id: "Price:sum", fieldName: "Price", aggregator: "sum" },
        { id: "Price:avg", fieldName: "Price", aggregator: "avg", userDefinedName: "Price avg" },
      ],
    });

    setContextualFormat(model, "B5", "[$$]#,##0.00"); // only on the first measure
    // prettier-ignore
    expect(getEvaluatedGrid(model, "A3:C5")).toEqual([
      ["Pivot",      "Total",   ""],
      ["",           "Price",   "Price avg"],
      ["Total",      "$10.00",  "10"],
    ]);

    setContextualFormat(model, "B5:C5", "[$€]#,##0.00"); // on both measures
    // prettier-ignore
    expect(getEvaluatedGrid(model, "A3:C5")).toEqual([
      ["Pivot",      "Total",   ""],
      ["",           "Price",   "Price avg"],
      ["Total",      "€10.00",  "€10.00"],
    ]);
  });

  test("format on a pivot values overwrites user defined format", async () => {
    const grid = {
      A1: "Price",
      A2: "10",
      A3: "=PIVOT(1)",
    };
    const model = await createModelFromGrid(grid);
    addPivot(model, "A1:A2", {
      measures: [{ id: "Price", fieldName: "Price", aggregator: "sum" }],
    });
    await setFormat(model, "B5", "0.0%");
    setContextualFormat(model, "B5", "[$$]#,##0.00");
    expect(getCell(model, "B5")?.format).toBeUndefined();
    expect(getEvaluatedCell(model, "B5").formattedValue).toBe("$10.00");
  });

  test("format both pivot values and normal cells", async () => {
    const grid = {
      A1: "Price",
      A2: "10",
      A3: "=PIVOT(1)",
    };
    const model = await createModelFromGrid(grid);
    addPivot(model, "A1:A2", {
      measures: [{ id: "Price", fieldName: "Price", aggregator: "sum" }],
    });
    setContextualFormat(model, "B5:B6", "[$$]#,##0.00");
    expect(getCell(model, "B5")?.format).toBeUndefined();
    expect(getCell(model, "B6")?.format).toBe("[$$]#,##0.00");
    expect(getEvaluatedCell(model, "B5")?.format).toBe("[$$]#,##0.00");
  });

  test("measure format takes precedence over aggregate format", async () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price",  C1: "=PIVOT(1)",
      A2: "Alice",    B2: "10",
    };
    const model = await createModelFromGrid(grid);
    addPivot(model, "A1:B2", {
      rows: [{ fieldName: "Customer" }],
      measures: [{ id: "Price", fieldName: "Price", aggregator: "count" }],
    });
    setContextualFormat(model, "D3", "[$$]#,##0.00");
    // prettier-ignore
    expect(getEvaluatedGrid(model, "C1:D4")).toEqual([
      ["Pivot",      "Total"],
      ["",           "Price"],
      ["Alice",      "$1.00"],
      ["Total",      "$1.00"],
    ]);
  });

  test("format is not applied on the measure with fixed pivot values", async () => {
    // prettier-ignore
    const grid = {
      A1: "Customer", B1: "Price",  C1: '=PIVOT.VALUE(1, "Price")',
      A2: "Alice",    B2: "10",
    };
    const model = await createModelFromGrid(grid);
    addPivot(model, "A1:B2", {
      rows: [{ fieldName: "Customer" }],
      measures: [{ id: "Price", fieldName: "Price", aggregator: "count" }],
    });
    setContextualFormat(model, "C1", "[$$]#,##0.00");
    expect(model.getters.getPivotCoreDefinition("1")?.measures[0].format).toBeUndefined();
    expect(getCell(model, "C1")?.format).toBe("[$$]#,##0.00");
  });

  test("topbar menu correctly indicates the format of the selected pivot cell", async () => {
    const env = await makeTestEnv();
    const { model } = env;

    await setCellContent(model, "A1", "Price");
    await setCellContent(model, "A2", "10");
    await setCellContent(model, "B1", "=PIVOT(1)");

    addPivot(model, "A1:A2", {
      measures: [{ id: "Price", fieldName: "Price", aggregator: "sum" }],
    });
    setContextualFormat(model, "C3", "[$$]#,##0.00");
    await selectCell(model, "C3");

    const action = getNode(["format", "format_number", "format_number_currency"], env);
    expect(action.isActive?.(env)).toBe(true);
  });
});

describe("formatting values (when change decimal)", () => {
  test("Can't change decimal format of a cell that isn't 'number' type", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "kikou");
    expect(getCellContent(model, "A1")).toBe("kikou");
    await selectCell(model, "A1");
    await setDecimal(model, "A1", 1);
    expect(getCell(model, "A1")!.format).toBe(undefined);
    expect(getCellContent(model, "A1")).toBe("kikou");
  });

  test("Can't change decimal format of a cell when value not exist", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "42%");
    await deleteContent(model, ["A1"]);
    expect(getCell(model, "A1")!.format).toBe("0%");
    await setDecimal(model, "A1", 1);
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
    async (noneDecimal, oneDecimal, twoDecimal) => {
      const model = await createModel();

      await setCellContent(model, "A1", "42");
      await selectCell(model, "A1");
      await setFormat(model, "A1", oneDecimal);
      await setDecimal(model, "A1", 1);
      expect(getCell(model, "A1")!.format).toBe(twoDecimal);

      await setCellContent(model, "A2", "42");
      await selectCell(model, "A2");
      await setFormat(model, "A2", oneDecimal);
      await setDecimal(model, "A2", -1);
      expect(getCell(model, "A2")!.format).toBe(noneDecimal);

      await setCellContent(model, "A3", "42");
      await selectCell(model, "A3");
      await setFormat(model, "A3", noneDecimal);
      await setDecimal(model, "A3", 1);
      expect(getCell(model, "A3")!.format).toBe(oneDecimal);

      await setCellContent(model, "A4", "42");
      await selectCell(model, "A4");
      await setFormat(model, "A4", noneDecimal);
      await setDecimal(model, "A4", -1);
      expect(getCell(model, "A4")!.format).toBe(noneDecimal);
    }
  );

  test("Can change decimal format of a cell that hasn't format (case 'number' type only)", async () => {
    const model = await createModel();

    await setCellContent(model, "A1", "123");
    expect(getCell(model, "A1")!.format).toBe(undefined);
    await selectCell(model, "A1");
    await setDecimal(model, "A1", 1);
    expect(getCell(model, "A1")!.format).toBe("0.0");

    await setCellContent(model, "A2", "456");
    expect(getCell(model, "A2")!.format).toBe(undefined);
    await selectCell(model, "A2");
    await setDecimal(model, "A2", -1);
    expect(getCell(model, "A2")!.format).toBe("0");

    await setCellContent(model, "B1", "123.456");
    expect(getCell(model, "B1")!.format).toBe(undefined);
    await selectCell(model, "B1");
    await setDecimal(model, "B1", 1);
    expect(getCell(model, "B1")!.format).toBe("0.0000");

    await setCellContent(model, "B2", "456.789");
    expect(getCell(model, "B2")!.format).toBe(undefined);
    await selectCell(model, "B2");
    await setDecimal(model, "B2", -1);
    expect(getCell(model, "B2")!.format).toBe("0.00");
  });

  test("Decimal format is limited to 20 zeros after the decimal point", async () => {
    const model = await createModel();

    const nineteenZerosA1 = "0.0000000000000000000";
    const twentyZerosA1 = "0.00000000000000000000";
    await setCellContent(model, "A1", "123");
    await setFormat(model, "A1", nineteenZerosA1);
    await setDecimal(model, "A1", 1);
    await setDecimal(model, "A1", 1);
    await setDecimal(model, "A1", 1);
    expect(getCell(model, "A1")!.format).toBe(twentyZerosA1);

    const seventeenZerosB1 = "0.00000000000000000%";
    const twentyZerosB1 = "0.00000000000000000000%";
    await setCellContent(model, "B1", "9%");
    await setFormat(model, "B1", seventeenZerosB1);
    await setDecimal(model, "B1", 1);
    await setDecimal(model, "B1", 1);
    await setDecimal(model, "B1", 1);
    await setDecimal(model, "B1", 1);
    await setDecimal(model, "B1", 1);
    await setDecimal(model, "B1", 1);
    expect(getCell(model, "B1")!.format).toBe(twentyZerosB1);

    const eighteenZerosC1 = "#,##0.000000000000000000";
    const twentyZerosC1 = "#,##0.00000000000000000000";
    await setCellContent(model, "C1", "3456.789");
    await setFormat(model, "C1", eighteenZerosC1);
    await setDecimal(model, "C1", 1);
    await setDecimal(model, "C1", 1);
    await setDecimal(model, "C1", 1);
    await setDecimal(model, "C1", 1);
    expect(getCell(model, "C1")!.format).toBe(twentyZerosC1);
  });

  test("Change decimal format on a range does nothing if there isn't 'number' type", async () => {
    const model = await createModel();

    // give values ​​with different formats

    await setCellContent(model, "A2", "Hey Jude");
    await setFormat(model, "A2", "0.00%");
    expect(getCellContent(model, "A2")).toBe("Hey Jude");

    await setCellContent(model, "A3", "12/12/2012");
    await selectCell(model, "A3");
    expect(getCellContent(model, "A3")).toBe("12/12/2012");

    await setCellContent(model, "C1", "LEBLEBI");
    expect(getCellContent(model, "C1")).toBe("LEBLEBI");

    // select A1, then expand selection to A1:C3
    await selectCell(model, "A1");

    await setAnchorCorner(model, "C3");

    // increase decimalFormat on the selection

    await setDecimal(model, "A1:C3", 1);

    expect(getCellContent(model, "A2")).toBe("Hey Jude");
    expect(getCellContent(model, "A3")).toBe("12/12/2012");
    expect(getCellContent(model, "C1")).toBe("LEBLEBI");

    expect(getCell(model, "A2")!.format).toBe("0.00%");
    expect(getCell(model, "A3")!.format).toBe("m/d/yyyy");
    expect(getCell(model, "C1")!.format).toBe(undefined);
  });

  test("Check multiple format in selected zone", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "100%");
    await setCellContent(model, "B1", "$190.12");
    await setCellContent(model, "C1", "$21");
    await setDecimal(model, "A1:C1", 1);
    expect(getCellContent(model, "A1")).toEqual("100.0%");
    expect(getCellContent(model, "B1")).toEqual("$190.120");
    expect(getCellContent(model, "C1")).toEqual("$21.0");
  });

  test("Check multiple format in multiple zone", async () => {
    const model = await createModel();
    await setCellContent(model, "A1", "100%");
    await setCellContent(model, "B1", "$190.12");
    await setCellContent(model, "C1", "$21");
    await setCellContent(model, "A3", "100%");
    await setCellContent(model, "B3", "$190.12");
    await setCellContent(model, "C3", "$21");
    await setDecimal(model, "A1:C1", 1);
    await setDecimal(model, "A3:C3", 1);
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
  let ctx: CanvasRenderingContext2D;
  const hPadding = 2 * PADDING_AUTORESIZE_HORIZONTAL;
  const vPadding = 2 * PADDING_AUTORESIZE_VERTICAL;

  beforeEach(async () => {
    model = await createModel();
    sheetId = model.getters.getActiveSheetId();
    ctx = document.createElement("canvas").getContext("2d")!;
    ctx.font = `${fontSizeInPixels(DEFAULT_FONT_SIZE)}px ${DEFAULT_FONT}`;
    sizes = [TEXT, LONG_TEXT].map((text) => ctx.measureText(text).width);
  });

  test("Can autoresize a column", async () => {
    await setCellContent(model, "A1", TEXT);
    const initCellWidth = sizes[0] + hPadding;
    await autoresizeColumns(model, [0]);
    expect(model.getters.getColSize(sheetId, 0)).toBe(initCellWidth);
  });

  test("Can autoresize a column with multiline content", async () => {
    const content = `Hello this is \nmultiline content for test`;
    await setCellContent(model, "A1", content);
    await autoresizeColumns(model, [0]);
    const position = { sheetId, ...toCartesian("A1") };
    const style = model.getters.getCellComputedStyle(position);
    const multiLineText = content.split(NEWLINE);
    expect(model.getters.getColSize(sheetId, 0)).toBe(
      Math.max(...multiLineText.map((line) => model.getters.getTextWidth(line, style))) + hPadding
    );
  });

  test("Can autoresize a column with text width smaller than cell width", async () => {
    await setCellContent(model, "A1", TEXT);
    const initCellWidth = sizes[0] + hPadding;
    const newCellWidth = initCellWidth * 2;
    await resizeColumns(model, ["A"], newCellWidth);
    expect(model.getters.getColSize(sheetId, 0)).toBe(newCellWidth);
    await autoresizeColumns(model, [0]);
    expect(model.getters.getColSize(sheetId, 0)).toBe(initCellWidth);
  });

  test("Can autoresize a column with text width smaller than cell width, and cell in wrap mode", async () => {
    await setCellContent(model, "A1", TEXT);
    const initCellWidth = sizes[0] + hPadding;
    const newCellWidth = initCellWidth * 2;
    await resizeColumns(model, ["A"], newCellWidth);
    await setFormatting(model, "A1", { wrapping: "wrap" });
    expect(model.getters.getColSize(sheetId, 0)).toBe(newCellWidth);
    await autoresizeColumns(model, [0]);
    expect(model.getters.getColSize(sheetId, 0)).toBe(initCellWidth);
  });

  test("Can autoresize a column with text width greater than cell width", async () => {
    await setCellContent(model, "A1", LONG_TEXT);
    const initCellWidth = sizes[1] + hPadding;
    const newCellWidth = initCellWidth / 2;
    await resizeColumns(model, ["A"], newCellWidth);
    expect(model.getters.getColSize(sheetId, 0)).toBe(newCellWidth);
    await autoresizeColumns(model, [0]);
    expect(model.getters.getColSize(sheetId, 0)).toBe(initCellWidth);
  });

  test("Can't autoresize a column with text width greater than cell width, and cell in wrap mode", async () => {
    await setCellContent(model, "A1", "size0");
    const initCellWidth = sizes[0] + hPadding;
    const newCellWidth = initCellWidth / 2;
    await resizeColumns(model, ["A"], newCellWidth);
    await setFormatting(model, "A1", { wrapping: "wrap" });
    expect(model.getters.getColSize(sheetId, 0)).toBe(newCellWidth);
    await autoresizeColumns(model, [0]);
    expect(model.getters.getColSize(sheetId, 0)).toBe(newCellWidth);
  });

  test("Can autoresize two columns", async () => {
    await setCellContent(model, "A1", TEXT);
    await setCellContent(model, "C1", LONG_TEXT);
    await autoresizeColumns(model, [0, 2]);
    expect(model.getters.getColSize(sheetId, 0)).toBe(sizes[0] + hPadding);
    expect(model.getters.getColSize(sheetId, 2)).toBe(sizes[1] + hPadding);
  });

  test("Autoresize includes filter icon to compute the size", async () => {
    await setCellContent(model, "A1", TEXT);
    await createTableWithFilter(model, "A1");
    await autoresizeColumns(model, [0]);
    expect(model.getters.getColSize(sheetId, 0)).toBe(
      sizes[0] + hPadding + GRID_ICON_EDGE_LENGTH + GRID_ICON_MARGIN
    );
  });

  test("Autoresize includes cells with only a filter icon", async () => {
    await createTableWithFilter(model, "A1");
    await autoresizeColumns(model, [0]);
    expect(model.getters.getColSize(sheetId, 0)).toBe(
      hPadding + GRID_ICON_EDGE_LENGTH + GRID_ICON_MARGIN
    );
  });

  test("Can autoresize a row", async () => {
    await resizeRows(model, [0], DEFAULT_CELL_HEIGHT + 42);
    await setCellContent(model, "A1", "test");
    await autoresizeRows(model, [0]);
    expect(model.getters.getRowSize(sheetId, 0)).toBe(DEFAULT_CELL_HEIGHT);
  });

  test("Can autoresize two rows", async () => {
    await resizeRows(model, [0, 2], DEFAULT_CELL_HEIGHT + 30);
    await setCellContent(model, "A1", "test");
    await setCellContent(model, "A3", "test");
    await setFormatting(model, "A3", { fontSize: 24 });
    await autoresizeRows(model, [0, 2]);
    expect(model.getters.getRowSize(sheetId, 0)).toBe(DEFAULT_CELL_HEIGHT);
    expect(model.getters.getRowSize(sheetId, 2)).toBe(fontSizeInPixels(24) + vPadding);
  });

  test("Only a single resize command is dispatched when auto-resizing multiple rows", async () => {
    const rows = [0, 1, 2];
    await resizeRows(model, rows, DEFAULT_CELL_HEIGHT + 30);
    const handleCmd = spyUiPluginHandle(model);
    await autoresizeRows(model, [0, 1, 2]);
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

  test("Can autoresize a row with evaluated multi-line content", async () => {
    await setCellContent(model, "A1", '="Hello\nThere"');
    expect(model.getters.getRowSize(sheetId, 0)).toBe(DEFAULT_CELL_HEIGHT);
    await autoresizeRows(model, [0]);
    const numberOfLines = 2;
    const lineHeight = 13; // default font size in px
    const expectedHeight =
      numberOfLines * (lineHeight + MIN_CELL_TEXT_MARGIN) -
      MIN_CELL_TEXT_MARGIN +
      2 * PADDING_AUTORESIZE_VERTICAL;
    expect(model.getters.getRowSize(sheetId, 0)).toBe(expectedHeight);
  });

  test("Evaluated multi-line content have no impact on autoresize if it's not taller than non-evaluated content", async () => {
    await setCellContent(model, "A1", '="Hello\nThere"');

    await setCellContent(model, "B1", "Hello\nThere\nGeneral");
    await autoresizeRows(model, [0]);
    expect(model.getters.getUserRowSize(sheetId, 0)).toBe(undefined);

    await setCellContent(model, "B1", "Hello\nThere");
    await autoresizeRows(model, [0]);
    expect(model.getters.getUserRowSize(sheetId, 0)).toBe(undefined);

    await setCellContent(model, "B1", "Hello");
    await autoresizeRows(model, [0]);
    expect(model.getters.getUserRowSize(sheetId, 0)).toBe(36);
  });

  test("Auto-resizes a row correctly when it contains an array formula result", async () => {
    await setCellContent(model, "A1", "=RANDARRAY(2, 2)");
    expect(model.getters.getRowSize(sheetId, 1)).toBe(DEFAULT_CELL_HEIGHT);
    await setFormatting(model, "A2", { fontSize: 40 });
    await autoresizeRows(model, [1]);
    const position = { sheetId, ...toCartesian("A2") };
    const evaluatedSize = getCellContentHeight(
      ctx,
      model.getters.getEvaluatedCell(position).formattedValue,
      model.getters.getCellStyle(position),
      DEFAULT_CELL_WIDTH
    );
    expect(model.getters.getRowSize(sheetId, 1)).toBe(evaluatedSize);
  });

  test("Can autoresize a column in another sheet", async () => {
    const initialSize = model.getters.getColSize(sheetId, 0);
    const newSheetId = "42";
    await createSheet(model, { sheetId: newSheetId });
    await setCellContent(model, "A1", TEXT, newSheetId);
    await autoresizeColumns(model, [0], newSheetId);
    expect(model.getters.getColSize(sheetId, 0)).toBe(initialSize);
    expect(model.getters.getColSize(newSheetId, 0)).toBe(sizes[0] + hPadding);
  });

  test("Can autoresize a row in another sheet", async () => {
    const initialSize = model.getters.getRowSize(sheetId, 0);
    const newSheetId = "42";
    await createSheet(model, { sheetId: newSheetId });
    await resizeRows(model, [0], DEFAULT_CELL_HEIGHT + 30, "42");
    await setCellContent(model, "A1", "test", newSheetId);
    await autoresizeRows(model, [0], newSheetId);
    expect(model.getters.getRowSize(sheetId, 0)).toBe(initialSize);
    expect(model.getters.getRowSize(newSheetId, 0)).toBe(DEFAULT_CELL_HEIGHT);
  });

  test("Autoresizing empty cols has no effect", async () => {
    const initialSize = model.getters.getColSize(sheetId, 0);
    await autoresizeColumns(model, [0]);
    expect(model.getters.getColSize(sheetId, 0)).toBe(initialSize);
    await setCellContent(model, "A1", '=""');
    await autoresizeColumns(model, [0]);
    expect(model.getters.getColSize(sheetId, 0)).toBe(initialSize);
  });

  test("row height does not take into account line breaks in the formula", async () => {
    const initialSize = model.getters.getRowSize(sheetId, 0);
    await setCellContent(model, "A1", "=5\n\n-3\n\n-9");
    expect(getCellContent(model, "A1")).toEqual("-7");
    expect(model.getters.getRowSize(sheetId, 0)).toEqual(initialSize);
  });

  test.each([-Math.PI / 2, -Math.PI / 3, -Math.PI / 4, 0, Math.PI / 4, Math.PI / 3, Math.PI / 2])(
    "Autoresize work with rotated text %s",
    async (rotation) => {
      const noRotationStyle = { fontSize: 20 };

      await setFormatting(model, "A1", { rotation, ...noRotationStyle });

      const cos = Math.abs(Math.cos(rotation));
      const sin = Math.abs(Math.sin(rotation));
      let width, height;

      await setCellContent(model, "A1", "ABC");
      ({ width, height } = model.getters.getMultilineTextSize(["ABC"], noRotationStyle));
      await autoresizeColumns(model, [0]);
      expect(model.getters.getColSize(sheetId, 0)).toEqual(
        Math.round(cos * width + sin * height + 2 * PADDING_AUTORESIZE_HORIZONTAL)
      );
      await autoresizeRows(model, [0]);
      expect(model.getters.getRowSize(sheetId, 0)).toEqual(
        Math.round(sin * width + cos * height + 2 * PADDING_AUTORESIZE_VERTICAL)
      );

      await setCellContent(model, "A1", "ABC\n123");
      ({ width, height } = model.getters.getMultilineTextSize(["ABC", "123"], noRotationStyle));
      await autoresizeColumns(model, [0]);
      expect(model.getters.getColSize(sheetId, 0)).toEqual(
        Math.round(cos * width + sin * height + 2 * PADDING_AUTORESIZE_HORIZONTAL)
      );
      await autoresizeRows(model, [0]);
      expect(model.getters.getRowSize(sheetId, 0)).toEqual(
        Math.round(sin * width + cos * height + 2 * PADDING_AUTORESIZE_VERTICAL)
      );

      await setCellContent(model, "A1", "ABC-123");
      ({ width, height } = model.getters.getMultilineTextSize(["ABC-123"], noRotationStyle));
      await autoresizeColumns(model, [0]);
      expect(model.getters.getColSize(sheetId, 0)).toEqual(
        Math.round(cos * width + sin * height + 2 * PADDING_AUTORESIZE_HORIZONTAL)
      );
      await autoresizeRows(model, [0]);
      expect(model.getters.getRowSize(sheetId, 0)).toEqual(
        Math.round(sin * width + cos * height + 2 * PADDING_AUTORESIZE_VERTICAL)
      );
    }
  );
});
