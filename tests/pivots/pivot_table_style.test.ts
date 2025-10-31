import { PIVOT_TABLE_PRESETS } from "@odoo/o-spreadsheet-engine/helpers/pivot_table_presets";
import { Model, Style, TableStyle, UID } from "../../src";
import { getTables, hideColumns, hideRows, setCellContent } from "../test_helpers";
import { getGridStyle } from "../test_helpers/helpers";
import { createModelWithPivot, updatePivot } from "../test_helpers/pivot_helpers";

let model: Model;
let sheetId: UID;

describe("Pivot table style", () => {
  const wholePivotStyle: Style = { fillColor: "#fcc", textColor: "#fcc" };
  const headerRowStyle: Style = { fillColor: "#aaf", textColor: "#aaf" };
  const measureHeaderStyle: Style = { fillColor: "#8a8", textColor: "#8a8" };
  const mainSubHeaderRowStyle: Style = { fillColor: "#f3f", textColor: "#f3f" };
  const firstAlternatingSubHeaderRow: Style = { fillColor: "#119", textColor: "#119" };
  const secondAlternatingSubHeaderRow: Style = { fillColor: "#e99", textColor: "#e99" };
  const totalRowStyle: Style = { fillColor: "#ffa", textColor: "#ffa" };
  const firstRowStripeStyle: Style = { fillColor: "#ddd", textColor: "#ddd" };
  const secondRowStripeStyle: Style = { fillColor: "#eee", textColor: "#eee" };
  const firstColumnStripeStyle: Style = { fillColor: "#b78", textColor: "#b78" };
  const secondColumnStripeStyle: Style = { fillColor: "#a46", textColor: "#a46" };

  let tableStyle: TableStyle;

  beforeEach(() => {
    tableStyle = {
      category: "medium",
      templateName: "TestStyle",
      displayName: "Test Style",
      primaryColor: "#ff0000",
    };
    PIVOT_TABLE_PRESETS.TestStyle = tableStyle;
    model = createModelWithPivot("A1:I22");
    sheetId = model.getters.getActiveSheetId();
    updatePivot(model, "1", {
      columns: [],
      rows: [],
      measures: [{ id: "revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
    });
    setCellContent(model, "A25", "=PIVOT(1)");
  });

  afterEach(() => {
    delete PIVOT_TABLE_PRESETS.TestStyle;
  });

  test("Can apply a simple pivot table style", () => {
    tableStyle.wholeTable = { style: wholePivotStyle };
    updatePivot(model, "1", {
      rows: [{ fieldName: "Salesperson" }],
      style: { tableStyleId: "TestStyle" },
    });

    expect(getTables(model, sheetId)[0]).toMatchObject({ zone: "A25:B29" });
    // prettier-ignore
    expect(getGridStyle(model)).toMatchObject({
        A25: wholePivotStyle,     B25: wholePivotStyle,
        A26: wholePivotStyle,     B26: wholePivotStyle,
        A27: wholePivotStyle,     B27: wholePivotStyle,
        A28: wholePivotStyle,     B28: wholePivotStyle,
        A29: wholePivotStyle,     B29: wholePivotStyle,
    });
  });

  test("Pivot tables can have filters", () => {
    updatePivot(model, "1", {
      style: { tableStyleId: "TestStyle", hasFilters: true },
    });
    expect(getTables(model, sheetId)[0]).toMatchObject({
      zone: "A25:B27",
      config: { hasFilters: true },
    });
  });

  test("Row headers have the correct style applied", () => {
    tableStyle.wholeTable = { style: wholePivotStyle };
    tableStyle.headerRow = { style: headerRowStyle };
    tableStyle.measureHeader = { style: measureHeaderStyle };
    tableStyle.mainSubHeaderRow = { style: mainSubHeaderRowStyle };
    tableStyle.firstAlternatingSubHeaderRow = { style: firstAlternatingSubHeaderRow };
    tableStyle.totalRow = { style: totalRowStyle };

    updatePivot(model, "1", {
      rows: [
        { fieldName: "Created on", granularity: "year" },
        { fieldName: "Stage" },
        { fieldName: "Active" },
      ],
      style: { tableStyleId: "TestStyle" },
    });

    // prettier-ignore
    expect(getGridStyle(model)).toMatchObject({
      A25: headerRowStyle,           B25: headerRowStyle,        // Header Row
      A26: headerRowStyle,           B26: measureHeaderStyle,    // Measure Header Row
      A27: mainSubHeaderRowStyle,    B27: mainSubHeaderRowStyle, // Created on - Year (2024)
      A28: firstAlternatingSubHeaderRow,     B28: firstAlternatingSubHeaderRow,  // Stage (New)
      A29: wholePivotStyle,          B29: wholePivotStyle,       // Active (TRUE)
      A30: wholePivotStyle,          B30: wholePivotStyle,       // Active (FALSE)
      A31: firstAlternatingSubHeaderRow,     B31: firstAlternatingSubHeaderRow,  // Stage (Won)
      A32: wholePivotStyle,          B32: wholePivotStyle,       // Active (TRUE)
      A33: wholePivotStyle,          B33: wholePivotStyle,       // Active (FALSE)
      A34: firstAlternatingSubHeaderRow,     B34: firstAlternatingSubHeaderRow,  // Stage (Proposition)
      A35: wholePivotStyle,          B35: wholePivotStyle,       // Active (TRUE)
      A36: wholePivotStyle,          B36: wholePivotStyle,       // Active (FALSE)
      A37: firstAlternatingSubHeaderRow,     B37: firstAlternatingSubHeaderRow,  // Stage (Qualified)
      A38: wholePivotStyle,          B38: wholePivotStyle,       // Active (TRUE)
      A39: wholePivotStyle,          B39: wholePivotStyle,       // Active (FALSE)
      A40: totalRowStyle,            B40: totalRowStyle,         // Total
    });
  });

  test("Row headers have the correct style when some rows are hidden", () => {
    tableStyle.wholeTable = { style: wholePivotStyle };
    tableStyle.mainSubHeaderRow = { style: mainSubHeaderRowStyle };
    tableStyle.firstAlternatingSubHeaderRow = { style: firstAlternatingSubHeaderRow };

    updatePivot(model, "1", {
      rows: [{ fieldName: "Created on", granularity: "month" }, { fieldName: "Active" }],
      style: { tableStyleId: "TestStyle" },
    });
    hideRows(model, [26, 28]);

    // prettier-ignore
    expect(getGridStyle(model)).toMatchObject({
      A27: {},                       B27: {},                    // [HIDDEN] Created on - Month (April 2024)
      A28: wholePivotStyle,          B28: wholePivotStyle,       // Active (TRUE)
      A29: {},                       B29: {},                    // [HIDDEN] Active (FALSE)
      A30: mainSubHeaderRowStyle,    B30: mainSubHeaderRowStyle, // Created on - Month (March 2024)
      A31: wholePivotStyle,          B31: wholePivotStyle,       // Active (TRUE)
      A32: wholePivotStyle,          B32: wholePivotStyle,       // Active (FALSE)
    });
  });

  test("First and second sub-sub-headers style is alternating", () => {
    tableStyle.wholeTable = { style: wholePivotStyle };
    tableStyle.headerRow = { style: headerRowStyle };
    tableStyle.measureHeader = { style: measureHeaderStyle };
    tableStyle.mainSubHeaderRow = { style: mainSubHeaderRowStyle };
    tableStyle.firstAlternatingSubHeaderRow = { style: firstAlternatingSubHeaderRow };
    tableStyle.secondAlternatingSubHeaderRow = { style: secondAlternatingSubHeaderRow };

    updatePivot(model, "1", {
      rows: [
        { fieldName: "Created on", granularity: "year" },
        { fieldName: "Created on", granularity: "month" },
        { fieldName: "Active" },
        { fieldName: "Salesperson" },
        { fieldName: "Stage" },
      ],
      style: { tableStyleId: "TestStyle" },
    });

    // prettier-ignore
    expect(getGridStyle(model)).toMatchObject({
      A25: headerRowStyle,          B25: headerRowStyle,        // Header Row
      A26: headerRowStyle,          B26: measureHeaderStyle,    // Measure Header Row
      A27: mainSubHeaderRowStyle,   B27: mainSubHeaderRowStyle, // Created on - Year (2024)
      A28: firstAlternatingSubHeaderRow,    B28: firstAlternatingSubHeaderRow,  // Created on - Month (April 2024)
      A29: secondAlternatingSubHeaderRow,   B29: secondAlternatingSubHeaderRow, // Active (TRUE)
      A30: firstAlternatingSubHeaderRow,    B30: firstAlternatingSubHeaderRow,  // Salesperson (Kevin)
      A31: wholePivotStyle,         B31: wholePivotStyle,       // Stage (New)
    });
  });

  test("Measure header style is not displayed if the measure headers are not displayed", () => {
    tableStyle.wholeTable = { style: wholePivotStyle };
    tableStyle.headerRow = { style: headerRowStyle };
    tableStyle.measureHeader = { style: measureHeaderStyle };

    updatePivot(model, "1", {
      rows: [{ fieldName: "Created on", granularity: "year" }],
      style: { tableStyleId: "TestStyle", displayMeasuresRow: false },
    });

    // prettier-ignore
    expect(getGridStyle(model)).toMatchObject({
      A25: headerRowStyle,          B25: headerRowStyle,        // Header Row
      A26: wholePivotStyle,         B26: wholePivotStyle,       // Created on - Year (2024)
    });
  });

  test("Header style is not displayed if the headers are not displayed", () => {
    tableStyle.wholeTable = { style: wholePivotStyle };
    tableStyle.headerRow = { style: headerRowStyle };
    tableStyle.measureHeader = { style: measureHeaderStyle };

    updatePivot(model, "1", {
      rows: [{ fieldName: "Created on", granularity: "year" }],
      style: { tableStyleId: "TestStyle", displayColumnHeaders: false },
    });

    // prettier-ignore
    expect(getGridStyle(model)).toMatchObject({
      A25: headerRowStyle,           B25: measureHeaderStyle,    // Measure Header
      A26: wholePivotStyle,          B26: wholePivotStyle,       // Created on - Year (2024)
    });
  });

  test("Total style is not displayed if the total row is not displayed", () => {
    tableStyle.wholeTable = { style: wholePivotStyle };
    tableStyle.headerRow = { style: headerRowStyle };
    tableStyle.totalRow = { style: totalRowStyle };

    updatePivot(model, "1", {
      rows: [{ fieldName: "Created on", granularity: "year" }],
      style: { tableStyleId: "TestStyle", displayTotals: false },
    });

    // prettier-ignore
    expect(getGridStyle(model, "A25:B28")).toEqual({
      A25: headerRowStyle,          B25: headerRowStyle,       // Measure Header
      A26: headerRowStyle,          B26: headerRowStyle,       // Created on - Year (2024)
      A27: wholePivotStyle,         B27: wholePivotStyle,      // Created on - Year (2024)
      A28: {},                      B28: {},                   // No total row
    });
  });

  test("Can display banded row style", () => {
    tableStyle.wholeTable = { style: wholePivotStyle };
    tableStyle.headerRow = { style: headerRowStyle };
    tableStyle.firstRowStripe = { style: firstRowStripeStyle };
    tableStyle.secondRowStripe = { style: secondRowStripeStyle };

    updatePivot(model, "1", {
      rows: [
        { fieldName: "Created on", granularity: "year" },
        { fieldName: "Created on", granularity: "month" },
      ],
      style: { tableStyleId: "TestStyle", bandedRows: true },
    });

    // prettier-ignore
    expect(getGridStyle(model)).toMatchObject({
      A25: headerRowStyle,          B25: headerRowStyle,        // Header Row
      A26: headerRowStyle,          B26: headerRowStyle,        // Measure Header Row
      A27: firstRowStripeStyle,     B27: firstRowStripeStyle,
      A28: secondRowStripeStyle,    B28: secondRowStripeStyle,
      A29: firstRowStripeStyle,     B29: firstRowStripeStyle,
      A30: secondRowStripeStyle,    B30: secondRowStripeStyle,
      A31: firstRowStripeStyle,     B31: firstRowStripeStyle,
    });
  });

  test("Banded row style takes hidden rows into account", () => {
    tableStyle.wholeTable = { style: wholePivotStyle };
    tableStyle.headerRow = { style: headerRowStyle };
    tableStyle.firstRowStripe = { style: firstRowStripeStyle };
    tableStyle.secondRowStripe = { style: secondRowStripeStyle };

    updatePivot(model, "1", {
      rows: [
        { fieldName: "Created on", granularity: "year" },
        { fieldName: "Created on", granularity: "month" },
      ],
      style: { tableStyleId: "TestStyle", bandedRows: true },
    });
    hideRows(model, [27, 29]);

    // prettier-ignore
    expect(getGridStyle(model, "A25:B31")).toEqual({
      A25: headerRowStyle,          B25: headerRowStyle,        // Header Row
      A26: headerRowStyle,          B26: headerRowStyle,        // Measure Header Row
      A27: firstRowStripeStyle,     B27: firstRowStripeStyle,
      A28: {},                      B28: {},                    // Hidden row
      A29: secondRowStripeStyle,    B29: secondRowStripeStyle,
      A30: {},                      B30: {},                    // Hidden row
      A31: firstRowStripeStyle,     B31: firstRowStripeStyle,
    });
  });

  test("Can display banded columns style", () => {
    tableStyle.wholeTable = { style: wholePivotStyle };
    tableStyle.headerRow = { style: headerRowStyle };
    tableStyle.firstColumnStripe = { style: firstColumnStripeStyle };
    tableStyle.secondColumnStripe = { style: secondColumnStripeStyle };

    updatePivot(model, "1", {
      columns: [
        { fieldName: "Created on", granularity: "year" },
        { fieldName: "Created on", granularity: "month" },
      ],
      style: { tableStyleId: "TestStyle", bandedColumns: true },
    });

    // prettier-ignore
    expect(getGridStyle(model)).toMatchObject({
      A25: headerRowStyle,          B25: headerRowStyle,           C25: headerRowStyle,          D25: headerRowStyle,
      A26: headerRowStyle,          B26: headerRowStyle,           C26: headerRowStyle,          D26: headerRowStyle,
      A27: headerRowStyle,          B27: headerRowStyle,           C27: headerRowStyle,          D27: headerRowStyle,
      A28: firstColumnStripeStyle,  B28: secondColumnStripeStyle,  C28: firstColumnStripeStyle,  D28: secondColumnStripeStyle,
    });
  });

  test("Banded columns style takes hidden columns into account", () => {
    tableStyle.firstColumnStripe = { style: firstColumnStripeStyle };
    tableStyle.secondColumnStripe = { style: secondColumnStripeStyle };

    updatePivot(model, "1", {
      columns: [
        { fieldName: "Created on", granularity: "year" },
        { fieldName: "Created on", granularity: "month" },
      ],
      style: { tableStyleId: "TestStyle", bandedColumns: true },
    });
    hideColumns(model, ["B"]);

    // prettier-ignore
    expect(getGridStyle(model)).toMatchObject({
      A28: firstColumnStripeStyle,  B28: {},  C28: secondColumnStripeStyle,  D28: firstColumnStripeStyle,
    });
  });

  test("Table style take the pivot function arguments into account", () => {
    tableStyle.wholeTable = { style: wholePivotStyle };
    tableStyle.headerRow = { style: headerRowStyle };
    tableStyle.measureHeader = { style: measureHeaderStyle };
    tableStyle.totalRow = { style: totalRowStyle };

    updatePivot(model, "1", {
      rows: [{ fieldName: "Created on", granularity: "year" }],
      style: { tableStyleId: "TestStyle" },
    });
    setCellContent(model, "A25", "=PIVOT(1, , , FALSE, , FALSE)"); // No column title/measure header

    expect(getTables(model, sheetId)[0]).toMatchObject({ zone: "A25:B26" });
    // prettier-ignore
    expect(getGridStyle(model)).toMatchObject({
      A25: wholePivotStyle,          B25: wholePivotStyle,   // Created on - Year (2024)
      A26: totalRowStyle,            B26: totalRowStyle,     // Total
    });
  });

  test("Pivot formula do not have style if it is not the first function of the formula", () => {
    updatePivot(model, "1", {
      style: { tableStyleId: "TestStyle" },
    });
    setCellContent(model, "A25", "=TRANSPOSE(PIVOT(1))");

    expect(getTables(model, sheetId)).toHaveLength(0);
  });
});
