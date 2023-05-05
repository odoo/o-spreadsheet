import { ICON_SETS } from "../src/components/icons/icons";
import { buildSheetLink, formatValue, lettersToNumber, markdownLink, toZone } from "../src/helpers";
import { Border, CellIsRule, DEFAULT_LOCALE, IconSetRule, Style } from "../src/types";
import { BarChartDefinition } from "../src/types/chart/bar_chart";
import { LineChartDefinition } from "../src/types/chart/line_chart";
import { PieChartDefinition } from "../src/types/chart/pie_chart";
import { XLSXCfOperatorType, XLSXSharedFormula } from "../src/types/xlsx";
import { hexaToInt } from "../src/xlsx/conversion/color_conversion";
import { convertXlsxFormat } from "../src/xlsx/conversion/format_conversion";
import { adaptFormula } from "../src/xlsx/conversion/formula_conversion";
import {
  TABLE_BORDER_STYLE,
  TABLE_HEADER_STYLE,
  TABLE_HIGHLIGHTED_CELL_STYLE,
} from "../src/xlsx/conversion/table_conversion";
import { getRelativePath } from "../src/xlsx/helpers/misc";
import { XLSXImportWarningManager } from "../src/xlsx/helpers/xlsx_parser_error_manager";
import { XlsxReader } from "../src/xlsx/xlsx_reader";
import { SheetData, WorkbookData } from "./../src/types/workbook_data";
import {
  BORDER_STYLE_CONVERSION_MAP,
  CF_THRESHOLD_CONVERSION_MAP,
  CF_TYPE_CONVERSION_MAP,
  convertCFCellIsOperator,
  H_ALIGNMENT_CONVERSION_MAP,
  ICON_SET_CONVERSION_MAP,
  V_ALIGNMENT_CONVERSION_MAP,
} from "./../src/xlsx/conversion/conversion_maps";
import {
  getCFBeginningAt,
  getColPosition,
  getRowPosition,
  getWorkbookCell,
  getWorkbookCellBorder,
  getWorkbookCellFormat,
  getWorkbookCellStyle,
  getWorkbookSheet,
  standardizeColor,
} from "./test_helpers/xlsx";
import { getTextXlsxFiles } from "./__xlsx__/read_demo_xlsx";

describe("Import xlsx data", () => {
  let convertedData: WorkbookData;
  beforeAll(() => {
    const demo_xlsx = getTextXlsxFiles();
    const reader = new XlsxReader(demo_xlsx);
    convertedData = reader.convertXlsx();
  });

  test("Can import cell content", () => {
    const testSheet = getWorkbookSheet("jestSheet", convertedData)!;
    const cell = getWorkbookCell(0, 0, testSheet);
    expect(cell?.content).toEqual("string");
  });

  test("Can import formula", () => {
    const testSheet = getWorkbookSheet("jestSheet", convertedData)!;
    const cell = getWorkbookCell(0, 1, testSheet);
    expect(cell?.content).toEqual("=SUM(A1)");
  });

  test("Can import merge", () => {
    const testSheet = getWorkbookSheet("jestSheet", convertedData)!;
    expect(testSheet.merges).toEqual(["D1:E2"]);
  });

  test("Can import hyperlinks", () => {
    const testSheet = getWorkbookSheet("jestSheet", convertedData)!;
    expect(testSheet.cells["D3"]?.content).toEqual(
      markdownLink("hyperlink", "https://www.odoo.com/")
    );
    expect(testSheet.cells["F3"]?.content).toEqual(
      markdownLink("sheetLink", buildSheetLink("jestSheet"))
    );
  });

  test("Can import row size", () => {
    const testSheet = getWorkbookSheet("jestSheet", convertedData)!;
    expect(testSheet.rows[4].size).toEqual(100);
  });

  test("Can import col size", () => {
    const testSheet = getWorkbookSheet("jestSheet", convertedData)!;
    // Columns size in excel are dumb.
    // In the Excel UI it says  "size 13.57, 100 px", then it saves size = 14.28 in the xml...
    // And if I dare to open and save the xlsx with Excel in another language the size changes...
    // I'll just test if the size is approximately right
    expect(testSheet.cols[lettersToNumber("F")].size).toBeBetween(80, 120);
  });

  test("Can import hidden rows", () => {
    const testSheet = getWorkbookSheet("jestSheet", convertedData)!;
    expect(testSheet.rows[3].isHidden).toBeTruthy();
  });

  test("Can import hidden cols", () => {
    const testSheet = getWorkbookSheet("jestSheet", convertedData)!;
    expect(testSheet.cols[lettersToNumber("C")].isHidden).toBeTruthy();
  });

  test("Can import external reference", () => {
    // External references are cells that have references to another xlsx file
    const testSheet = getWorkbookSheet("jestSheet", convertedData)!;
    expect(testSheet.cells["H2"]?.content).toEqual('="referenced string"');
  });

  test.each([
    ["darkGray", "A2"],
    ["mediumGray", "A3"],
    ["lightGray", "A4"],
    ["gray0625", "A5"],
    ["darkHorizontal", "A6"],
    ["darkVertical", "A7"],
    ["darkDown", "A8"],
    ["darkUp", "A9"],
    ["darkGrid", "A10"],
    ["darkTrellis", "A11"],
    ["lightHorizontal", "A12"],
    ["lightVertical", "A13"],
    ["lightDown", "A14"],
    ["lightUp", "A15"],
    ["lightGrid", "A16"],
    ["lightTrellis", "A17"],
  ])("Can import fills", (fillType, cellXc) => {
    const testSheet = getWorkbookSheet("jestStyles", convertedData)!;
    const styledCell = testSheet.cells[cellXc]!;
    const cellStyle = getWorkbookCellStyle(styledCell, convertedData);
    expect(standardizeColor(cellStyle!.fillColor!)).toEqual("#FFC000FF");
  });

  test.each([
    ["thin", "C2"],
    ["hair", "C4"],
    ["dotted", "C6"],
    ["dashDotDot", "C8"],
    ["dashDot", "C10"],
    ["dashed", "C12"],
    ["mediumDashDotDot", "C14"],
    ["slantDashDot", "C16"],
    ["mediumDashDot", "C18"],
    ["mediumDashed", "C20"],
    ["medium", "C22"],
    ["thick", "C24"],
    ["double", "C26"],
    ["thick #ff0000", "C28"],
  ])("Can import borders", (borderType, cellXc) => {
    const testSheet = getWorkbookSheet("jestStyles", convertedData)!;
    const cell = testSheet.cells[cellXc]!;
    const cellBorders = getWorkbookCellBorder(cell, convertedData)!;
    const cellContentSplit = borderType.split(" ");
    const expectedBorderStyle = BORDER_STYLE_CONVERSION_MAP[cellContentSplit[0]];
    const expectedBorderColor =
      cellContentSplit.length === 2 ? standardizeColor(cellContentSplit[1]) : "#000000FF";
    for (let side of ["top", "bottom", "left", "right"]) {
      expect(cellBorders[side].style).toEqual(expectedBorderStyle);
      expect(standardizeColor(cellBorders[side].color)).toEqual(expectedBorderColor);
    }
  });

  test.each([
    ["general", "F2"],
    ["left", "F3"],
    ["center", "F4"],
    ["right", "F5"],
    ["fill", "F6"],
    ["justify", "F7"],
    ["centerContinuous", "F8"],
    ["distributed", "F9"],
  ])("Can import Horizontal Alignment %s", (alignType, cellXc) => {
    const testSheet = getWorkbookSheet("jestStyles", convertedData)!;
    const styledCell = testSheet.cells[cellXc]!;
    const cellStyle = getWorkbookCellStyle(styledCell, convertedData);
    expect(cellStyle?.align).toEqual(H_ALIGNMENT_CONVERSION_MAP[alignType]);
  });

  test.each([
    [undefined, "F12"],
    ["top", "F13"],
    ["center", "F14"],
    ["justify", "F15"],
    ["distributed", "F16"],
  ])("Can import Vertical Alignment %s", (alignType, cellXc) => {
    const testSheet = getWorkbookSheet("jestStyles", convertedData)!;
    const styledCell = testSheet.cells[cellXc]!;
    const cellStyle = getWorkbookCellStyle(styledCell, convertedData);
    expect(cellStyle?.verticalAlign).toEqual(
      alignType === undefined ? undefined : V_ALIGNMENT_CONVERSION_MAP[alignType]
    );
  });

  test.each([
    ["overflow", "F19"],
    ["wrap", "F20"],
  ])("Can import wrapping mode %s", (wrapType, cellXc) => {
    const testSheet = getWorkbookSheet("jestStyles", convertedData)!;
    const styledCell = testSheet.cells[cellXc]!;
    const cellStyle = getWorkbookCellStyle(styledCell, convertedData);
    expect(cellStyle?.wrapping).toEqual(wrapType);
  });

  test.each([
    ["0.00", "M2"],
    ["0.00%", "M3"],
    ["m/d/yyyy", "M4"],
    ["#,##0.00 [$€]", "M5"],
    ["[$$]#,##0.000", "M6"],
    ["[$₪] #,##0", "M7"],
    ["#,##0[$ EUR €]", "M8"],
    ["not supported: multiple escaped sequences", "M9"],
  ])("Can import format %s", (format, cellXc) => {
    const testSheet = getWorkbookSheet("jestStyles", convertedData)!;
    const formattedCell = testSheet.cells[cellXc]!;
    const cellFormat = getWorkbookCellFormat(formattedCell, convertedData);
    let expectedFormat: string | undefined = format;
    if (format.startsWith("not supported")) {
      expectedFormat = undefined;
    }
    expect(cellFormat).toEqual(expectedFormat);
  });

  test.each([
    ["Red", "H2"],
    ["Italic", "H3"],
    ["Bold", "H4"],
    ["Striked", "H5"],
    ["Underlined", "H6"],
    ["size12", "H7"],
    ["size16", "H8"],
  ])("Can import font styles", (style, cellXc) => {
    const testSheet = getWorkbookSheet("jestStyles", convertedData)!;
    const cell = testSheet.cells[cellXc]!;
    const cellStyle = getWorkbookCellStyle(cell, convertedData);
    switch (style) {
      case "Red":
        expect(standardizeColor(cellStyle!.textColor!)).toEqual("#FF0000FF");
        break;
      case "Italic":
        expect(cellStyle!.italic).toBeTruthy();
        break;
      case "Bold":
        expect(cellStyle!.bold).toBeTruthy();
        break;
      case "Striked":
        expect(cellStyle!.strikethrough).toBeTruthy();
        break;
      case "Underlined":
        expect(cellStyle!.underline).toBeTruthy();
        break;
      case "size12":
        expect(cellStyle!.fontSize).toEqual(12);
        break;
      case "size16":
        expect(cellStyle!.fontSize).toEqual(16);
        break;
    }
  });

  test.each([
    ["aboveAverage", "B2"],
    ["beginsWith", "B3"],
    ["containsBlanks", "B4"],
    ["containsErrors", "B5"],
    ["containsText", "B6"],
    ["duplicateValues", "B7"],
    ["endsWith", "B8"],
    ["notContainsBlanks", "B9"],
    ["notContainsErrors", "B10"],
    ["notContainsText", "B11"],
    ["timePeriod", "B12"],
    ["top10", "B13"],
    ["uniqueValues", "B14"],
    ["expression", "B15"],
    ["cellIs equal", "B16"],
    ["cellIs notEqual", "B17"],
    ["cellIs greaterThan", "B18"],
    ["cellIs greaterThanOrEqual", "B19"],
    ["cellIs lessThan", "B20"],
    ["cellIs lessThanOrEqual", "B21"],
    ["cellIs between", "B22"],
    ["cellIs notBetween", "B23"],
  ])("Can import conditional format '%s'", (cfDescription, cfStartRange) => {
    const testSheet = getWorkbookSheet("jestCfs", convertedData)!;
    const split = cfDescription.split(" ");
    const cfType = split[0];
    const cellIsOperator = split[1];
    const cf = getCFBeginningAt(cfStartRange, testSheet)!;

    let operator = "";
    const values: string[] = [];
    switch (cfType) {
      case "containsErrors":
      case "notContainsErrors":
      case "timePeriod":
      case "aboveAverage":
      case "top10":
      case "uniqueValues":
      case "duplicateValues":
      case "dataBar":
      case "expression":
        // Unsupported CF types
        expect(cf).toBeUndefined();
        return;
      case "containsText":
      case "notContainsText":
      case "beginsWith":
      case "endsWith":
        operator = CF_TYPE_CONVERSION_MAP[cfType]!;
        values.push("rule");
        break;
      case "containsBlanks":
      case "notContainsBlanks":
        operator = CF_TYPE_CONVERSION_MAP[cfType]!;
        break;
      case "cellIs":
        operator = convertCFCellIsOperator(cellIsOperator as XLSXCfOperatorType);
        values.push("2");
        if (["between", "notBetween"].includes(cellIsOperator)) {
          values.push("4");
        }
        break;
    }
    expect(cf.rule.type).toEqual("CellIsRule");
    expect((cf.rule as CellIsRule).operator).toEqual(operator);
    expect((cf.rule as CellIsRule).values).toEqual(values);
  });

  test.each([
    ["2 colors max", "H2"],
    ["3 colors max", "H3"],
    ["2 colors num", "H4"],
    ["2 colors percent", "H5"],
    ["2 colors percentile", "H6"],
    ["2 colors formula", "H7"],
  ])("Can import Color Scales", (colorScaleDescr, cfStartRange) => {
    const testSheet = getWorkbookSheet("jestCfs", convertedData)!;
    const cf = getCFBeginningAt(cfStartRange, testSheet)!;
    const split = colorScaleDescr.split(" ");
    const numberOfThresholds = Number(split[0]);
    const thresholdType = split[2];
    let values: (string | undefined)[] = [];
    switch (thresholdType) {
      case "max":
        values = [undefined, undefined];
        break;
      case "num":
        values = ["1", "5"];
        break;
      case "percent":
      case "percentile":
        values = ["10", "90"];
        break;
      case "formula":
        values = ["$J$6", "$H$6"];
        break;
    }
    const minThreshold = {
      color: hexaToInt("#ed7d31"),
      type: CF_THRESHOLD_CONVERSION_MAP[thresholdType],
      value: values[0],
    };
    const maxThreshold = {
      color: hexaToInt("#ffc000"),
      type: CF_THRESHOLD_CONVERSION_MAP[thresholdType],
      value: values[1],
    };
    const middleThreshold =
      numberOfThresholds === 2
        ? undefined
        : {
            color: hexaToInt("#f69e19"),
            type: "percentile",
            value: "50",
          };

    expect(cf.rule).toMatchObject({
      type: "ColorScaleRule",
      minimum: minThreshold,
      maximum: maxThreshold,
      midpoint: middleThreshold,
    });
  });

  test.each([
    ["3Arrows percent", "H11"],
    ["3ArrowsGray num", "H12"],
    ["3Flags percentile", "H13"],
    ["3TrafficLights1 formula", "H14"],
    ["3TrafficLights2", "H15"],
    ["3Signs", "H16"],
    ["3Symbols", "H17"],
    ["3Symbols2", "H18"],
    ["3Stars", "H19"],
    ["3Triangles", "H20"],
    ["4Arrows", "H21"],
    ["4ArrowsGray", "H22"],
    ["4RedToBlack", "H23"],
    ["4Rating", "H24"],
    ["4TrafficLights", "H25"],
    ["5Arrows", "H26"],
    ["5ArrowsGray", "H27"],
    ["5Rating", "H28"],
    ["5Quarters", "H29"],
    ["5Boxes", "H30"],
  ])("Can import icon sets", (iconSetDescr, cfStartRange) => {
    const testSheet = getWorkbookSheet("jestCfs", convertedData)!;
    const split = iconSetDescr.split(" ");
    const iconSetName = split[0];
    const thresholdType = split.length > 1 ? split[1] : "percent";

    let iconSet = {
      upper: ICON_SETS[ICON_SET_CONVERSION_MAP[iconSetName]]["good"],
      middle: ICON_SETS[ICON_SET_CONVERSION_MAP[iconSetName]]["neutral"],
      lower: ICON_SETS[ICON_SET_CONVERSION_MAP[iconSetName]]["bad"],
    };

    const cf = getCFBeginningAt(cfStartRange, testSheet)!;

    expect(cf.rule).toMatchObject({
      type: "IconSetRule",
      icons: iconSet,
    });
    expect((cf.rule as IconSetRule).lowerInflectionPoint.type).toEqual(
      CF_THRESHOLD_CONVERSION_MAP[thresholdType]
    );
    expect((cf.rule as IconSetRule).upperInflectionPoint.type).toEqual(
      CF_THRESHOLD_CONVERSION_MAP[thresholdType]
    );
  });

  test.each([
    ["NoIcons", "H31"],
    ["Reverse", "H32"],
    ["ShowOnlyIcon", "H33"],
    ["GreaterNotEqual", "H34"],
    ["MixIcons", "H35"],
    ["2Icons", "H36"],
    ["1Icon", "H37"],
  ])("special icon sets '%s'", (iconSetDescr, cfStartRange) => {
    const testSheet = getWorkbookSheet("jestCfs", convertedData)!;
    const cf = getCFBeginningAt(cfStartRange, testSheet)!;
    switch (iconSetDescr) {
      case "Reverse":
        expect(cf.rule).toMatchObject({
          icons: {
            upper: ICON_SETS.arrows.bad,
            middle: ICON_SETS.arrows.neutral,
            lower: ICON_SETS.arrows.good,
          },
        });
        break;
      case "MixIcons":
        expect(cf.rule).toMatchObject({
          icons: {
            upper: ICON_SETS.dots.good,
            middle: ICON_SETS.dots.neutral,
            lower: ICON_SETS.arrows.bad,
          },
        });
        break;
      case "GreaterNotEqual":
        expect(cf.rule).toMatchObject({
          upperInflectionPoint: { operator: "gt" },
          lowerInflectionPoint: { operator: "gt" },
        });
        break;
      case "NoIcons":
      case "2Icons":
      case "1Icons":
        // Empty icons should have been replaced by dots icons
        expect(cf.rule).toMatchObject({
          icons: {
            upper: ICON_SETS.dots.good,
            middle: ICON_SETS.dots.neutral,
            lower: ICON_SETS.dots.bad,
          },
        });
        break;
      case "ShowOnlyIcon":
        // ShowOnlyIcon boolean is ignored and it give a standard CF rule
        expect(cf.rule).toMatchObject({
          icons: {
            upper: ICON_SETS.arrows.good,
            middle: ICON_SETS.arrows.neutral,
            lower: ICON_SETS.arrows.bad,
          },
        });
        break;
    }
  });

  test("tables with headers are imported as FilterTables", () => {
    const sheet = getWorkbookSheet("jestTable", convertedData)!;
    expect(sheet.filterTables).toHaveLength(3);
    expect(sheet.filterTables[0]).toEqual({ range: "C3:J6" });
    expect(sheet.filterTables[1]).toEqual({ range: "C11:D12" });
    expect(sheet.filterTables[2]).toEqual({ range: "C30:D32" });
  });

  test("rows filtered by a table filter are hidden", () => {
    const sheet = getWorkbookSheet("jestTable", convertedData)!;
    expect(sheet.filterTables[2]).toEqual({ range: "C30:D32" });
    expect(sheet.cells["C31"]?.content).toEqual("Hidden");
    expect(sheet.rows[30].isHidden).toBeTruthy();
  });

  describe("table styles", () => {
    /** Test tables for styles are 2x2 tables located at the right of the cell describing them */
    let tableTestSheet: SheetData;
    beforeAll(() => {
      tableTestSheet = getWorkbookSheet("jestTable", convertedData)!;
    });

    test("Can display basic table style (borders on table outline)", () => {
      const tableZone = toZone("C8:D9");
      expect(
        getWorkbookCellBorder(
          getWorkbookCell(tableZone.left, tableZone.top, tableTestSheet)!,
          convertedData
        )
      ).toMatchObject({
        top: TABLE_BORDER_STYLE,
        bottom: undefined,
        left: TABLE_BORDER_STYLE,
        right: undefined,
      });
      expect(
        getWorkbookCellBorder(
          getWorkbookCell(tableZone.right, tableZone.top, tableTestSheet)!,
          convertedData
        )
      ).toMatchObject({
        top: TABLE_BORDER_STYLE,
        bottom: undefined,
        right: TABLE_BORDER_STYLE,
        left: undefined,
      });
      expect(
        getWorkbookCellBorder(
          getWorkbookCell(tableZone.left, tableZone.bottom, tableTestSheet)!,
          convertedData
        )
      ).toMatchObject({
        bottom: TABLE_BORDER_STYLE,
        top: undefined,
        left: TABLE_BORDER_STYLE,
        right: undefined,
      });
      expect(
        getWorkbookCellBorder(
          getWorkbookCell(tableZone.right, tableZone.bottom, tableTestSheet)!,
          convertedData
        )
      ).toMatchObject({
        bottom: TABLE_BORDER_STYLE,
        top: undefined,
        right: TABLE_BORDER_STYLE,
        left: undefined,
      });
    });

    test("Can display header style", () => {
      const tableZone = toZone("C11:D12");
      expect(
        getWorkbookCellStyle(
          getWorkbookCell(tableZone.left, tableZone.top, tableTestSheet)!,
          convertedData
        )
      ).toMatchObject(TABLE_HEADER_STYLE);
      expect(
        getWorkbookCellStyle(
          getWorkbookCell(tableZone.right, tableZone.top, tableTestSheet)!,
          convertedData
        )
      ).toMatchObject(TABLE_HEADER_STYLE);
    });

    test("Can highlight first table column", () => {
      const tableZone = toZone("C14:D15");
      expect(
        getWorkbookCellStyle(
          getWorkbookCell(tableZone.left, tableZone.top, tableTestSheet)!,
          convertedData
        )
      ).toMatchObject(TABLE_HIGHLIGHTED_CELL_STYLE);
      expect(
        getWorkbookCellStyle(
          getWorkbookCell(tableZone.left, tableZone.bottom, tableTestSheet)!,
          convertedData
        )
      ).toMatchObject(TABLE_HIGHLIGHTED_CELL_STYLE);
    });

    test("Can highlight last table column", () => {
      const tableZone = toZone("C17:D18");
      expect(
        getWorkbookCellStyle(
          getWorkbookCell(tableZone.right, tableZone.top, tableTestSheet)!,
          convertedData
        )
      ).toMatchObject(TABLE_HIGHLIGHTED_CELL_STYLE);
      expect(
        getWorkbookCellStyle(
          getWorkbookCell(tableZone.right, tableZone.bottom, tableTestSheet)!,
          convertedData
        )
      ).toMatchObject(TABLE_HIGHLIGHTED_CELL_STYLE);
    });

    test("Can display banded rows (borders between rows)", () => {
      const tableZone = toZone("C20:D21");
      expect(
        getWorkbookCellBorder(
          getWorkbookCell(tableZone.left, tableZone.bottom, tableTestSheet)!,
          convertedData
        )
      ).toMatchObject({ top: TABLE_BORDER_STYLE });
      expect(
        getWorkbookCellBorder(
          getWorkbookCell(tableZone.right, tableZone.bottom, tableTestSheet)!,
          convertedData
        )
      ).toMatchObject({ top: TABLE_BORDER_STYLE });
    });

    test("Can display banded columns (borders between columns)", () => {
      const tableZone = toZone("C23:D24");
      expect(
        getWorkbookCellBorder(
          getWorkbookCell(tableZone.right, tableZone.top, tableTestSheet)!,
          convertedData
        )
      ).toMatchObject({ left: TABLE_BORDER_STYLE });
      expect(
        getWorkbookCellBorder(
          getWorkbookCell(tableZone.right, tableZone.bottom, tableTestSheet)!,
          convertedData
        )
      ).toMatchObject({ left: TABLE_BORDER_STYLE });
    });

    test("Can display total row", () => {
      const tableZone = toZone("C26:D28");
      expect(getWorkbookCell(tableZone.left, tableZone.bottom, tableTestSheet)!.content).toEqual(
        "Total"
      );
    });
  });

  test("Can convert table formula ", () => {
    // Test table coordinates are in A1
    const testSheet = getWorkbookSheet("jestTable", convertedData)!;

    // Formula =[@Rank]+[@Age] => transformed to Col E + Col D
    expect(testSheet.cells["F4"]?.content).toEqual("=E4+D4");
    expect(testSheet.cells["F5"]?.content).toEqual("=E5+D5");

    // Formula =Sum([Rank]) => transformed to Sum(Col E)
    expect(testSheet.cells["G4"]?.content).toEqual("=SUM(E4:E5)");
    expect(testSheet.cells["G5"]?.content).toEqual("=SUM(E4:E5)");

    // Formula =Sum(TableName[[#All];[Rank]]) => transformed to Sum(Col E) (including totals)
    expect(testSheet.cells["H4"]?.content).toEqual("=SUM(E4:E6)");
    expect(testSheet.cells["H5"]?.content).toEqual("=SUM(E4:E6)");

    // Formula =TableName[[#Total];[Rank]] => transformed to bottom of Col E
    expect(testSheet.cells["I4"]?.content).toEqual("=E6");
    expect(testSheet.cells["I5"]?.content).toEqual("=E6");

    // Formula =TableName[[#Headers];[Rank]] => transformed to header of Col E
    expect(testSheet.cells["J4"]?.content).toEqual("=E3");
    expect(testSheet.cells["J5"]?.content).toEqual("=E3");
  });

  // We just import pivots as a Table (cells with some styling/borders).
  test("can import pivots", () => {
    // Test pivot coordinates are in A1
    const testSheet = getWorkbookSheet("jestPivot", convertedData)!;
    const pivotZone = toZone("C3:L21");

    for (let col = pivotZone.left; col <= pivotZone.right; col++) {
      for (let row = pivotZone.top; row <= pivotZone.bottom; row++) {
        // Special style for headers and first column
        let expectedStyle: Style | undefined = undefined;
        if (row === pivotZone.top || row === pivotZone.top + 1) {
          expectedStyle = TABLE_HEADER_STYLE;
        } else if (col === pivotZone.left) {
          expectedStyle = TABLE_HIGHLIGHTED_CELL_STYLE;
        }

        // Borders = outline of the table + top border between each row
        const expectedBorder: Border = {};
        if (col === pivotZone.right) {
          expectedBorder.right = TABLE_BORDER_STYLE;
        }
        if (col === pivotZone.left) {
          expectedBorder.left = TABLE_BORDER_STYLE;
        }
        if (row === pivotZone.bottom) {
          expectedBorder.bottom = TABLE_BORDER_STYLE;
        }
        expectedBorder.top = TABLE_BORDER_STYLE;

        if (expectedStyle) {
          expect(
            getWorkbookCellStyle(getWorkbookCell(col, row, testSheet)!, convertedData)
          ).toMatchObject(expectedStyle);
        }
        expect(getWorkbookCellBorder(getWorkbookCell(col, row, testSheet)!, convertedData)).toEqual(
          expectedBorder
        );
      }
    }
  });

  test.each([
    ["line chart", "C5:G18"],
    ["bar chart", "H5:L18"],
    ["pie chart", "C38:L56"],
    ["doughnut chart", "C19:L37"],
  ])("Can import figures ", (chartTitle, figureZone) => {
    const testSheet = getWorkbookSheet("jestCharts", convertedData)!;
    // Cells in the 1st column of the sheet contains jsons with expected figure data
    const figZone = toZone(figureZone);
    const figure = testSheet.figures.find((figure) => figure.data.title === chartTitle)!;

    // Don't test exact positions, because excel does some esoteric magic for units and sizes (+our conversion is wonky, hello hardcoded DPI)
    // We'll only test that the figure corners are located in the correct cells
    expect(figure.x).toBeBetween(
      getColPosition(figZone.left, testSheet),
      getColPosition(figZone.left + 1, testSheet)
    );
    expect(figure.y).toBeBetween(
      getRowPosition(figZone.top, testSheet),
      getRowPosition(figZone.top + 1, testSheet)
    );
    expect(figure.width).toBeBetween(
      getColPosition(figZone.right, testSheet) - getColPosition(figZone.left, testSheet),
      getColPosition(figZone.right + 1, testSheet) - getColPosition(figZone.left, testSheet)
    );
    expect(figure.height).toBeBetween(
      getRowPosition(figZone.bottom, testSheet) - getRowPosition(figZone.top, testSheet),
      getRowPosition(figZone.bottom + 1, testSheet) - getRowPosition(figZone.top, testSheet)
    );
    expect(figure.tag).toEqual("chart");
  });

  test.each([["bar chart", "bar", "#fff", ["Sheet1!B27:B35", "Sheet1!C27:C35"]]])(
    "Can import charts %s without dataset titles",
    (chartTitle, chartType, chartColor, chartDatasets) => {
      const testSheet = getWorkbookSheet("jestCharts", convertedData)!;
      const figure = testSheet.figures.find((figure) => figure.data.title === chartTitle)!;
      const chartData = figure.data as
        | LineChartDefinition
        | PieChartDefinition
        | BarChartDefinition;
      expect(chartData.title).toEqual(chartTitle);
      expect(chartData.type).toEqual(chartType);
      expect(standardizeColor(chartData.background!)).toEqual(standardizeColor(chartColor));

      expect(chartData.labelRange).toEqual("Sheet1!A27:A35");
      expect(chartData.dataSets).toEqual(chartDatasets);
      expect(chartData.dataSetsHaveTitle).toBeFalsy();
    }
  );

  test.each([
    ["line chart", "line", "#CECECE", ["Sheet1!B26:B35", "Sheet1!C26:C35"]],
    ["pie chart", "pie", "#fff", ["Sheet1!B26:B35"]],
    ["doughnut chart", "pie", "#fff", ["Sheet1!B26:B35", "Sheet1!C26:C35"]],
  ])(
    "Can import charts %s with dataset titles",
    (chartTitle, chartType, chartColor, chartDatasets) => {
      const testSheet = getWorkbookSheet("jestCharts", convertedData)!;
      const figure = testSheet.figures.find((figure) => figure.data.title === chartTitle)!;
      const chartData = figure.data as
        | LineChartDefinition
        | PieChartDefinition
        | BarChartDefinition;
      expect(chartData.title).toEqual(chartTitle);
      expect(chartData.type).toEqual(chartType);
      expect(standardizeColor(chartData.background!)).toEqual(standardizeColor(chartColor));

      expect(chartData.labelRange).toEqual("Sheet1!A26:A35");
      expect(chartData.dataSets).toEqual(chartDatasets);
      expect(chartData.dataSetsHaveTitle).toBeTruthy();
    }
  );

  describe("Misc tests", () => {
    test("Newlines characters in strings are removed", () => {
      const testSheet = getWorkbookSheet("jestMiscTest", convertedData)!;
      const textWithNewLineInXLSX = testSheet.cells["A1"]?.content;
      expect(textWithNewLineInXLSX).toEqual("This text have a newLine"); // newline should have been removed at import
    });

    test("Can hide gridLines", () => {
      const testSheet = getWorkbookSheet("jestMiscTest", convertedData)!;
      expect(testSheet.areGridLinesVisible).toEqual(false);
    });

    test("Can import hidden sheet", () => {
      const testSheet = getWorkbookSheet("jestHiddenSheet", convertedData)!;
      expect(testSheet.isVisible).toEqual(false);
    });
  });
});

test.each([
  ["xl/workbook.xml", "xl/worksheets/sheet0.xml", "worksheets/sheet0.xml"],
  ["xl/worksheets/sheet0.xml", "xl/workbook.xml", "../workbook.xml"],
  ["test/path/long/file.xml", "test/my/path/file2.xml", "../../my/path/file2.xml"],
])("get relative path", async (from: string, to: string, expected: string) => {
  expect(getRelativePath(from, to)).toEqual(expected);
});

test.each([
  ["A1", "=A1", "C3", "=C3"],
  ["A1", "=$A1", "C3", "=$A3"],
  ["A1", "=A$1", "C3", "=C$1"],
  ["A1", "=$A$1", "C3", "=$A$1"],
  ["A1", "=SUM(A1:B2, 3, C2)", "C3", "=SUM(C3:D4, 3, E4)"],
  ["A1", "=SUM($A$1:$B$2, 3, $C$2)", "C3", "=SUM($A$1:$B$2, 3, $C$2)"],
])("adapt formula", async (from: string, formula: string, target: string, expected: string) => {
  const sf = { refCellXc: from, formula: formula } as XLSXSharedFormula;
  expect(adaptFormula(target, sf)).toEqual(expected);
});

test.each([
  ["0.00", "0.00", "0.00"],
  ["0.00;0.00%", "0.00", "0.00"],
  ["0.000%", "0.000%", "0.000%"],
  ["#,##0.00", "#,##0.00", "0.00"],
  ["m/d/yyyy", "m/d/yyyy", "12/30/1899"],
  ["M/D/YYYY", "m/d/yyyy", "12/30/1899"],
  ["mmmmm/dddd/yy", "mmm/dddd/yy", "Dec/Saturday/99"],
  ["mmmm-ddd-yy", "mmmm-ddd-yy", "December-Sat-99"],
  ["mmm dd yy", "mmm dd yy", "Dec 30 99"],
  ["h AM/PM", "hh a", "12 AM"],
  ["HHHH:MM a/m", "hh:mm a", "12:00 AM"],
  ["m/d/yyyy\\ hh:mm:ss", "m/d/yyyy hh:mm:ss", "12/30/1899 00:00:00"],
  ["hh:mm:ss a", "hh:mm:ss a", "12:00:00 AM"],
  ['#,##0.00 "€"', "#,##0.00 [$€]", "0.00€"],
  ["[$$-409]#,##0.000", "[$$]#,##0.000", "$0.000"],
  ["[$-409]0.00", "0.00", "0.00"],
  ["[$MM/DD/YYYY]0", "[$MM/DD/YYYY]0", "MM/DD/YYYY0"],
  ["#,##0.00[$MM/DD/YYYY]", "#,##0.00[$MM/DD/YYYY]", "0.00MM/DD/YYYY"],
  ["[$₪-40D] #,##0.00", "[$₪] #,##0.00", "₪0.00"],
  ['"€"#,##0.00 "€"', undefined, "0"],
])("convert format %s", async (excelFormat, convertedFormat, expectedValue) => {
  expect(
    convertXlsxFormat(80, [{ id: 80, format: excelFormat }], new XLSXImportWarningManager())
  ).toEqual(convertedFormat);
  expect(formatValue(0, { format: convertedFormat, locale: DEFAULT_LOCALE })).toEqual(
    expectedValue
  );
});
