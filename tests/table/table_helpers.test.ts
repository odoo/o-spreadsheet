import { getComputedTableStyle } from "@odoo/o-spreadsheet-engine/helpers/table_helpers";
import {
  ComputedTableStyle,
  TableConfig,
  TableMetaData,
  TableStyle,
} from "@odoo/o-spreadsheet-engine/types/table";
import { deepCopy } from "../../src/helpers";
import { Border, BorderDescr, Style } from "../../src/types";

const TEST_TABLE_STYLE: TableStyle = {
  category: "light",
  displayName: "testStyle",
  templateName: "lightAllBorders",
  primaryColor: "#f00",
};

const TEST_TABLE_CONFIG: TableConfig = {
  hasFilters: false,
  totalRow: false,
  firstColumn: false,
  lastColumn: false,
  numberOfHeaders: 0,
  bandedRows: false,
  bandedColumns: false,
  styleId: "TestStyle",
};

let tableMetaData: TableMetaData;

let tableConfig: TableConfig;
let tableStyle: TableStyle;

/**
 * Get the borders for a cell in a table, combining the borders of the cell in the computedStyle with the borders of the
 * adjacent cells to get all the visible borders of the cell. This allow us to not worry about the implementation details
 * of the table style (whether it return only the right/bottom borders or top/left borders or all border).
 */
function getBorders(tableStyle: ComputedTableStyle, col: number, row: number): Border {
  const borders = tableStyle.borders;
  return {
    top: borders[col][row].top || borders[col][row - 1]?.bottom,
    bottom: borders[col][row].bottom || borders[col][row + 1]?.top,
    left: borders[col][row].left || borders[col - 1]?.[row].right,
    right: borders[col][row].right || borders[col + 1]?.[row].left,
  };
}

beforeEach(() => {
  tableConfig = deepCopy(TEST_TABLE_CONFIG);
  tableStyle = deepCopy(TEST_TABLE_STYLE);
  tableMetaData = {
    mode: "table",
    numberOfCols: 5,
    numberOfRows: 5,
  };
});

describe("Table cell style", () => {
  const wholeTableStyle = { fillColor: "#f00", textColor: "#f00" } as const;
  const firstColumnStyle = { fillColor: "#0f0", textColor: "#0f0" } as const;
  const lastColumnStyle = { fillColor: "#00f", textColor: "#00f" } as const;
  const headerRowStyle = { fillColor: "#ff0", textColor: "#ff0" } as const;
  const totalRowStyle = { fillColor: "#0ff", textColor: "#0ff" } as const;
  const firstRowStripeStyle = { fillColor: "#a0a", textColor: "#a0a" } as const;
  const secondRowStripeStyle = { fillColor: "#aa0", textColor: "#aa0" } as const;
  const firstColumnStripeStyle = { fillColor: "#00a", textColor: "#00a" } as const;
  const secondColumnStripeStyle = { fillColor: "#a00", textColor: "#a00" } as const;

  test("Can have style on whole table", () => {
    tableStyle.wholeTable = { style: wholeTableStyle };
    const computedStyle = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);
    expect(computedStyle.styles[0][0]).toMatchObject(wholeTableStyle);
  });

  test("Header row can have a style", () => {
    tableConfig.numberOfHeaders = 1;
    tableStyle.wholeTable = { style: wholeTableStyle };
    tableStyle.headerRow = { style: headerRowStyle };
    const computedStyle = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);

    expect(computedStyle.styles[0][0]).toMatchObject(headerRowStyle);
    expect(computedStyle.styles[0][1]).toMatchObject(wholeTableStyle);
  });

  test("Can have multiple header rows with style", () => {
    tableStyle.wholeTable = { style: wholeTableStyle };
    tableStyle.headerRow = { style: headerRowStyle };
    tableConfig.numberOfHeaders = 2;

    const computedStyle = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);
    expect(computedStyle.styles[0][0]).toMatchObject(headerRowStyle);
    expect(computedStyle.styles[0][1]).toMatchObject(headerRowStyle);
    expect(computedStyle.styles[0][2]).toMatchObject(wholeTableStyle);
  });

  test("Whole table vertical/horizontal borders are not applied inside the header rows", () => {
    tableStyle.wholeTable = {
      style: wholeTableStyle,
      border: {
        vertical: { color: "#f00", style: "thin" },
        horizontal: { color: "#0f0", style: "thin" },
      },
    };
    tableConfig.numberOfHeaders = 2;

    const computedStyle = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);
    expect(computedStyle.styles[0][0]).toMatchObject(wholeTableStyle);
    expect(computedStyle.borders[0][0]).toEqual({});
    expect(computedStyle.borders[0][1]).toEqual({ bottom: { color: "#0f0", style: "thin" } });
  });

  test("Total row can have a style", () => {
    tableConfig.totalRow = true;
    tableStyle.wholeTable = { style: wholeTableStyle };
    tableStyle.totalRow = { style: totalRowStyle };

    const computedStyle = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);
    expect(computedStyle.styles[0][3]).toMatchObject(wholeTableStyle);
    expect(computedStyle.styles[0][4]).toMatchObject(totalRowStyle);
  });

  test("Can have first/last column style", () => {
    tableConfig.firstColumn = true;
    tableConfig.lastColumn = true;
    tableStyle.wholeTable = { style: wholeTableStyle };
    tableStyle.firstColumn = { style: firstColumnStyle };
    tableStyle.lastColumn = { style: lastColumnStyle };

    const computedStyle = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);
    expect(computedStyle.styles[0][0]).toMatchObject(firstColumnStyle);
    expect(computedStyle.styles[1][0]).toMatchObject(wholeTableStyle);
    expect(computedStyle.styles[4][0]).toMatchObject(lastColumnStyle);
  });

  test("Total and header style have priority over first/last column", () => {
    tableConfig.numberOfHeaders = 1;
    tableConfig.totalRow = true;
    tableConfig.firstColumn = true;
    tableConfig.lastColumn = true;
    tableStyle.headerRow = { style: headerRowStyle };
    tableStyle.totalRow = { style: totalRowStyle };
    tableStyle.firstColumn = { style: firstColumnStyle };
    tableStyle.lastColumn = { style: lastColumnStyle };

    const computedStyle = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);
    expect(computedStyle.styles[0][0]).toMatchObject(headerRowStyle);
    expect(computedStyle.styles[0][1]).toMatchObject(firstColumnStyle);
    expect(computedStyle.styles[0][4]).toMatchObject(totalRowStyle);

    expect(computedStyle.styles[4][0]).toMatchObject(headerRowStyle);
    expect(computedStyle.styles[4][1]).toMatchObject(lastColumnStyle);
    expect(computedStyle.styles[4][4]).toMatchObject(totalRowStyle);
  });

  test("Can have banded rows", () => {
    tableConfig.bandedRows = true;
    tableStyle.firstRowStripe = { style: firstRowStripeStyle };
    tableStyle.secondRowStripe = { style: secondRowStripeStyle };

    const computedStyle = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);
    expect(computedStyle.styles[0][0]).toMatchObject(firstRowStripeStyle);
    expect(computedStyle.styles[0][1]).toMatchObject(secondRowStripeStyle);
    expect(computedStyle.styles[0][2]).toMatchObject(firstRowStripeStyle);
  });

  test("Headers and total rows are ignored in banded rows", () => {
    tableConfig.totalRow = true;
    tableConfig.numberOfHeaders = 2;
    tableConfig.bandedRows = true;
    tableStyle.firstRowStripe = { style: firstRowStripeStyle };
    tableStyle.secondRowStripe = { style: secondRowStripeStyle };

    const computedStyle = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);
    expect(computedStyle.styles[0][0]).toMatchObject({});
    expect(computedStyle.styles[0][1]).toMatchObject({});
    expect(computedStyle.styles[0][2]).toMatchObject(firstRowStripeStyle);
    expect(computedStyle.styles[0][3]).toMatchObject(secondRowStripeStyle);
    expect(computedStyle.styles[0][4]).toMatchObject({});
  });

  test("Can have banded columns", () => {
    tableConfig.bandedColumns = true;
    tableStyle.firstColumnStripe = { style: firstColumnStripeStyle };
    tableStyle.secondColumnStripe = { style: secondColumnStripeStyle };

    const computedStyle = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);
    expect(computedStyle.styles[0][0]).toMatchObject(firstColumnStripeStyle);
    expect(computedStyle.styles[1][0]).toMatchObject(secondColumnStripeStyle);
    expect(computedStyle.styles[2][0]).toMatchObject(firstColumnStripeStyle);
  });

  test("First and last column can be highlighted with banding columns", () => {
    tableConfig.bandedColumns = true;
    tableConfig.firstColumn = true;
    tableConfig.lastColumn = true;
    tableStyle.firstColumn = { style: firstColumnStyle };
    tableStyle.lastColumn = { style: lastColumnStyle };
    tableStyle.firstColumnStripe = { style: firstColumnStripeStyle };
    tableStyle.secondColumnStripe = { style: secondColumnStripeStyle };

    // Note that unlike header rows, the first and last column are NOT ignored in the col banding indexing (Excel behaviour)
    const computedStyle = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);
    expect(computedStyle.styles[0][0]).toMatchObject(firstColumnStyle);
    expect(computedStyle.styles[1][0]).toMatchObject(secondColumnStripeStyle);
    expect(computedStyle.styles[2][0]).toMatchObject(firstColumnStripeStyle);
    expect(computedStyle.styles[3][0]).toMatchObject(secondColumnStripeStyle);
    expect(computedStyle.styles[4][0]).toMatchObject(lastColumnStyle);
  });

  test("Banded column style applies to first/last column if they do not have a style defined", () => {
    tableConfig.bandedColumns = true;
    tableConfig.firstColumn = true;
    tableConfig.lastColumn = true;
    tableStyle.firstColumn = undefined;
    tableStyle.lastColumn = undefined;
    tableStyle.firstColumnStripe = { style: firstColumnStripeStyle };
    tableStyle.secondColumnStripe = { style: secondColumnStripeStyle };

    const computedStyle = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);
    expect(computedStyle.styles[0][0]).toMatchObject(firstColumnStripeStyle);
    expect(computedStyle.styles[1][0]).toMatchObject(secondColumnStripeStyle);
    expect(computedStyle.styles[2][0]).toMatchObject(firstColumnStripeStyle);
    expect(computedStyle.styles[3][0]).toMatchObject(secondColumnStripeStyle);
    expect(computedStyle.styles[4][0]).toMatchObject(firstColumnStripeStyle);
  });

  test("Banded column style do not applies to header/total rows in normal tables", () => {
    tableConfig.numberOfHeaders = 1;
    tableConfig.totalRow = true;
    tableConfig.bandedColumns = true;
    tableStyle.firstColumnStripe = { style: firstColumnStripeStyle };
    tableStyle.secondColumnStripe = { style: secondColumnStripeStyle };

    const computedStyle = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);
    expect(computedStyle.styles[0][0]).toMatchObject({});
    expect(computedStyle.styles[0][1]).toMatchObject(firstColumnStripeStyle);
    expect(computedStyle.styles[0][4]).toMatchObject({});
  });

  describe("Pivot specific table style", () => {
    const measureHeader: Style = { fillColor: "#8a8", textColor: "#8a8" };
    const mainSubHeaderRow: Style = { fillColor: "#f3f", textColor: "#f3f" };
    const firstAlternatingSubHeaderRow: Style = { fillColor: "#119", textColor: "#119" };
    const secondAlternatingSubHeaderRow: Style = { fillColor: "#e99", textColor: "#e99" };

    test("Banded column style does applies to total row in pivot", () => {
      tableConfig.numberOfHeaders = 1;
      tableConfig.totalRow = true;
      tableConfig.bandedColumns = true;
      tableStyle.firstColumnStripe = { style: firstColumnStripeStyle };
      tableStyle.secondColumnStripe = { style: secondColumnStripeStyle };
      tableMetaData.mode = "pivot";

      const computedStyle = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);
      expect(computedStyle.styles[0][4]).toMatchObject(firstColumnStripeStyle);
      expect(computedStyle.styles[1][4]).toMatchObject(secondColumnStripeStyle);
    });

    test("Can display a style on the measure row", () => {
      tableMetaData.measureRow = 1;
      tableStyle.measureHeader = { style: measureHeader };

      const computedStyle = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);
      expect(computedStyle.styles[0][0]).toEqual({});
      expect(computedStyle.styles[0][1]).toEqual({});
      expect(computedStyle.styles[1][1]).toMatchObject(measureHeader);
      expect(computedStyle.styles[4][1]).toMatchObject(measureHeader);
    });

    test("Can display a style on main sub-header rows", () => {
      tableMetaData.mainSubHeaderRows = new Set([0, 2]);
      tableStyle.mainSubHeaderRow = { style: mainSubHeaderRow };

      const computedStyle = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);
      expect(computedStyle.styles[0][0]).toMatchObject(mainSubHeaderRow);
      expect(computedStyle.styles[0][1]).toEqual({});
      expect(computedStyle.styles[0][2]).toMatchObject(mainSubHeaderRow);
      expect(computedStyle.styles[0][3]).toEqual({});
    });

    test("Can display a style on sub-sub-header rows", () => {
      tableMetaData.firstAlternatingSubHeaderRows = new Set([1, 3]);
      tableMetaData.secondAlternatingSubHeaderRows = new Set([2, 4]);
      tableStyle.firstAlternatingSubHeaderRow = { style: firstAlternatingSubHeaderRow };
      tableStyle.secondAlternatingSubHeaderRow = { style: secondAlternatingSubHeaderRow };

      const computedStyle = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);
      expect(computedStyle.styles[0][0]).toEqual({});
      expect(computedStyle.styles[0][1]).toMatchObject(firstAlternatingSubHeaderRow);
      expect(computedStyle.styles[0][2]).toMatchObject(secondAlternatingSubHeaderRow);
      expect(computedStyle.styles[0][3]).toMatchObject(firstAlternatingSubHeaderRow);
      expect(computedStyle.styles[0][4]).toMatchObject(secondAlternatingSubHeaderRow);
    });
  });
});

describe("Table cell borders", () => {
  const border: BorderDescr = { color: "#0f0", style: "thick" };
  const allBorders = { top: border, bottom: border, left: border, right: border };
  test("Can outline the table", () => {
    tableStyle.wholeTable = { border: allBorders };
    const computedStyle = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);
    expect(getBorders(computedStyle, 0, 0)).toEqual({ top: border, left: border });
    expect(getBorders(computedStyle, 0, 4)).toEqual({ bottom: border, left: border });
    expect(getBorders(computedStyle, 4, 0)).toEqual({ top: border, right: border });
    expect(getBorders(computedStyle, 4, 4)).toEqual({ bottom: border, right: border });

    expect(getBorders(computedStyle, 1, 1)).toEqual({});
  });

  test("Can have borders inside the table", () => {
    tableStyle.wholeTable = { border: { vertical: border, horizontal: border } };
    const computedStyle = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);
    expect(getBorders(computedStyle, 0, 0)).toEqual({ bottom: border, right: border });
    expect(getBorders(computedStyle, 0, 4)).toEqual({ top: border, right: border });
    expect(getBorders(computedStyle, 4, 0)).toEqual({ bottom: border, left: border });
    expect(getBorders(computedStyle, 4, 4)).toEqual({ top: border, left: border });

    expect(getBorders(computedStyle, 1, 1)).toEqual(allBorders);
  });

  test("Can have a border for headers", () => {
    tableConfig.numberOfHeaders = 2;
    tableStyle.headerRow = { border: allBorders };

    const computedStyle = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);
    expect(getBorders(computedStyle, 0, 0)).toEqual({ top: border, left: border });
    expect(getBorders(computedStyle, 0, 1)).toEqual({ bottom: border, left: border });
    expect(getBorders(computedStyle, 1, 0)).toEqual({ top: border });
    expect(getBorders(computedStyle, 1, 1)).toEqual({ bottom: border });
    expect(getBorders(computedStyle, 4, 0)).toEqual({ top: border, right: border });
    expect(getBorders(computedStyle, 4, 1)).toEqual({ bottom: border, right: border });
  });

  test("Can have a border on total row", () => {
    tableConfig.totalRow = true;
    tableStyle.totalRow = { border: allBorders };

    const computedStyle = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);
    expect(getBorders(computedStyle, 0, 3)).toEqual({ bottom: border });
    expect(getBorders(computedStyle, 1, 3)).toEqual({ bottom: border });

    expect(getBorders(computedStyle, 0, 4)).toEqual({ bottom: border, left: border, top: border });
    expect(getBorders(computedStyle, 1, 4)).toEqual({ bottom: border, top: border });
    expect(getBorders(computedStyle, 4, 4)).toEqual({ bottom: border, right: border, top: border });
  });

  test("Can have a border on first and last column", () => {
    tableConfig.firstColumn = true;
    tableConfig.lastColumn = true;
    tableStyle.firstColumn = { border: allBorders };
    tableStyle.lastColumn = { border: allBorders };

    const style = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);
    expect(getBorders(style, 0, 0)).toEqual({ top: border, right: border, left: border });
    expect(getBorders(style, 0, 1)).toEqual({ left: border, right: border });
    expect(getBorders(style, 0, 4)).toEqual({ bottom: border, right: border, left: border });

    expect(getBorders(style, 4, 0)).toEqual({ top: border, right: border, left: border });
    expect(getBorders(style, 4, 1)).toEqual({ right: border, left: border });
    expect(getBorders(style, 4, 4)).toEqual({ bottom: border, right: border, left: border });
  });

  test("Can have borders on first column stripe", () => {
    tableConfig.bandedColumns = true;
    tableStyle.firstColumnStripe = { border: allBorders };

    const computedStyle = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);
    expect(getBorders(computedStyle, 0, 0)).toEqual({ top: border, left: border, right: border });
    expect(getBorders(computedStyle, 1, 0)).toEqual({ right: border, left: border });
    expect(getBorders(computedStyle, 2, 0)).toEqual({ top: border, right: border, left: border });
    expect(getBorders(computedStyle, 3, 0)).toEqual({ right: border, left: border });
    expect(getBorders(computedStyle, 4, 0)).toEqual({ top: border, right: border, left: border });
  });

  test("Can have borders on second column stripe", () => {
    tableConfig.bandedColumns = true;
    tableStyle.secondColumnStripe = { border: allBorders };

    const computedStyle = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);
    expect(getBorders(computedStyle, 0, 0)).toEqual({ right: border });
    expect(getBorders(computedStyle, 1, 0)).toEqual({ top: border, right: border, left: border });
    expect(getBorders(computedStyle, 2, 0)).toEqual({ right: border, left: border });
    expect(getBorders(computedStyle, 3, 0)).toEqual({ top: border, right: border, left: border });
    expect(getBorders(computedStyle, 4, 0)).toEqual({ left: border });
  });

  test("Second column stripe borders have priority over first column stripe", () => {
    const border2 = { ...border, color: "#00f" };
    tableConfig.bandedColumns = true;
    tableStyle.firstColumnStripe = { border: { left: border, right: border } };
    tableStyle.secondColumnStripe = { border: { left: border2, right: border2 } };

    const computedStyle = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);
    expect(getBorders(computedStyle, 0, 0)).toEqual({ left: border, right: border2 });
    expect(getBorders(computedStyle, 1, 0)).toEqual({ left: border2, right: border2 });
    expect(getBorders(computedStyle, 2, 0)).toEqual({ left: border2, right: border2 });
    expect(getBorders(computedStyle, 3, 0)).toEqual({ left: border2, right: border2 });
    expect(getBorders(computedStyle, 4, 0)).toEqual({ left: border2, right: border });
  });

  test("Banded col borders are not in the headers or total rows in normal tables", () => {
    tableConfig.totalRow = true;
    tableConfig.numberOfHeaders = 2;
    tableConfig.bandedColumns = true;
    tableStyle.firstColumnStripe = { border: allBorders };
    tableStyle.secondColumnStripe = { border: allBorders };

    const computedStyle = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);
    expect(getBorders(computedStyle, 0, 0)).toEqual({});
    expect(getBorders(computedStyle, 0, 1)).toEqual({ bottom: border });
    expect(getBorders(computedStyle, 0, 4)).toEqual({ top: border });
  });

  test("Can have borders on first row stripe", () => {
    tableConfig.bandedRows = true;
    tableStyle.firstRowStripe = { border: allBorders };

    const computedStyle = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);
    expect(getBorders(computedStyle, 0, 0)).toEqual({ top: border, bottom: border, left: border });
    expect(getBorders(computedStyle, 0, 1)).toEqual({ top: border, bottom: border });
    expect(getBorders(computedStyle, 0, 2)).toEqual({ top: border, bottom: border, left: border });
    expect(getBorders(computedStyle, 0, 3)).toEqual({ top: border, bottom: border });
    expect(getBorders(computedStyle, 0, 4)).toEqual({ top: border, bottom: border, left: border });
  });

  test("Can have borders on second row stripe", () => {
    tableConfig.bandedRows = true;
    tableStyle.secondRowStripe = { border: allBorders };

    const computedStyle = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);
    expect(getBorders(computedStyle, 0, 0)).toEqual({ bottom: border });
    expect(getBorders(computedStyle, 0, 1)).toEqual({ top: border, bottom: border, left: border });
    expect(getBorders(computedStyle, 0, 2)).toEqual({ top: border, bottom: border });
    expect(getBorders(computedStyle, 0, 3)).toEqual({ top: border, bottom: border, left: border });
    expect(getBorders(computedStyle, 0, 4)).toEqual({ top: border });
  });

  test("Second row stripe borders have priority over first column stripe", () => {
    const border2 = { ...border, color: "#00f" };
    tableConfig.bandedRows = true;
    tableStyle.firstRowStripe = { border: { top: border, bottom: border } };
    tableStyle.secondRowStripe = { border: { top: border2, bottom: border2 } };

    const computedStyle = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);
    expect(getBorders(computedStyle, 0, 0)).toEqual({ top: border, bottom: border2 });
    expect(getBorders(computedStyle, 0, 1)).toEqual({ top: border2, bottom: border2 });
    expect(getBorders(computedStyle, 0, 2)).toEqual({ top: border2, bottom: border2 });
    expect(getBorders(computedStyle, 0, 3)).toEqual({ top: border2, bottom: border2 });
    expect(getBorders(computedStyle, 0, 4)).toEqual({ top: border2, bottom: border });
  });

  test("Banded row borders are not in the headers or total rows", () => {
    tableConfig.totalRow = true;
    tableConfig.numberOfHeaders = 2;
    tableConfig.bandedRows = true;
    tableStyle.firstRowStripe = { border: allBorders };
    tableStyle.secondRowStripe = { border: allBorders };

    const computedStyle = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);
    expect(getBorders(computedStyle, 0, 0)).toEqual({});
    expect(getBorders(computedStyle, 0, 1)).toEqual({ bottom: border });
    expect(getBorders(computedStyle, 0, 4)).toEqual({ top: border });
  });

  test("Can set null border in style to overwrite other borders", () => {
    tableStyle.wholeTable = { border: allBorders };
    tableStyle.headerRow = {
      border: {
        top: null,
        left: null,
        right: null,
        bottom: null,
        vertical: null,
        horizontal: null,
      },
    };
    tableConfig.numberOfHeaders = 1;

    const computedStyle = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);
    expect(getBorders(computedStyle, 0, 0)).toEqual({});
    expect(getBorders(computedStyle, 0, 0)).toEqual({});
    expect(getBorders(computedStyle, 0, 1)).toEqual({ left: border });
  });

  describe("Pivot specific table border", () => {
    test("Banded col borders are in the total row of pivot", () => {
      tableConfig.totalRow = true;
      tableConfig.bandedColumns = true;
      tableStyle.firstColumnStripe = { border: allBorders };
      tableStyle.secondColumnStripe = { border: allBorders };
      tableMetaData.mode = "pivot";

      const computedStyle = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);
      const allBordersExceptTop = { bottom: border, left: border, right: border };
      expect(getBorders(computedStyle, 0, 4)).toEqual(allBordersExceptTop);
      expect(getBorders(computedStyle, 1, 4)).toEqual(allBordersExceptTop);
    });

    test("Can display a border on the measure row", () => {
      tableMetaData.measureRow = 1;
      tableStyle.measureHeader = { border: allBorders };

      const computedStyle = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);
      expect(getBorders(computedStyle, 1, 0)).toEqual({ bottom: border });
      const allBordersExceptRight = { top: border, bottom: border, left: border };
      expect(getBorders(computedStyle, 1, 1)).toEqual(allBordersExceptRight);
      expect(getBorders(computedStyle, 1, 2)).toEqual({ top: border });
    });

    test("Can display a style on main sub-header rows", () => {
      tableMetaData.mainSubHeaderRows = new Set([0, 2]);
      tableStyle.mainSubHeaderRow = { border: allBorders };

      const computedStyle = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);
      const allBordersExceptRight = { top: border, bottom: border, left: border };
      expect(getBorders(computedStyle, 0, 0)).toEqual(allBordersExceptRight);
      expect(getBorders(computedStyle, 0, 1)).toEqual({ top: border, bottom: border });
      expect(getBorders(computedStyle, 0, 2)).toEqual(allBordersExceptRight);
      expect(getBorders(computedStyle, 0, 3)).toEqual({ top: border });
    });

    test("Can display a border on sub-sub-header rows", () => {
      const border2: BorderDescr = { color: "#00f", style: "dashed" };
      tableMetaData.firstAlternatingSubHeaderRows = new Set([1, 3]);
      tableMetaData.secondAlternatingSubHeaderRows = new Set([2, 4]);
      tableStyle.firstAlternatingSubHeaderRow = { border: { top: border } };
      tableStyle.secondAlternatingSubHeaderRow = { border: { top: border2 } };

      const computedStyle = getComputedTableStyle(tableConfig, tableStyle, tableMetaData);
      expect(getBorders(computedStyle, 0, 0)).toEqual({ bottom: border });
      expect(getBorders(computedStyle, 0, 1)).toEqual({ top: border, bottom: border2 });
      expect(getBorders(computedStyle, 0, 2)).toEqual({ top: border2, bottom: border });
      expect(getBorders(computedStyle, 0, 3)).toEqual({ top: border, bottom: border2 });
      expect(getBorders(computedStyle, 0, 4)).toEqual({ top: border2 });
    });
  });
});
