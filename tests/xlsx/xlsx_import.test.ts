import { ICON_SETS } from "../../src/components/icons/icons";
import {
  buildSheetLink,
  formatValue,
  lettersToNumber,
  markdownLink,
  toZone,
} from "../../src/helpers";
import { DEFAULT_TABLE_CONFIG } from "../../src/helpers/table_presets";
import { CellIsRule, DEFAULT_LOCALE, IconSetRule, PLAIN_TEXT_FORMAT } from "../../src/types";
import { BarChartDefinition } from "../../src/types/chart/bar_chart";
import { ComboChartDefinition } from "../../src/types/chart/combo_chart";
import { LineChartDefinition } from "../../src/types/chart/line_chart";
import { PieChartDefinition } from "../../src/types/chart/pie_chart";
import { ScatterChartDefinition } from "../../src/types/chart/scatter_chart";
import { Image } from "../../src/types/image";
import { SheetData, WorkbookData } from "../../src/types/workbook_data";
import { XLSXCfOperatorType, XLSXSharedFormula } from "../../src/types/xlsx";
import { hexaToInt } from "../../src/xlsx/conversion/color_conversion";
import {
  BORDER_STYLE_CONVERSION_MAP,
  CF_THRESHOLD_CONVERSION_MAP,
  CF_TYPE_CONVERSION_MAP,
  H_ALIGNMENT_CONVERSION_MAP,
  ICON_SET_CONVERSION_MAP,
  V_ALIGNMENT_CONVERSION_MAP,
  convertCFCellIsOperator,
} from "../../src/xlsx/conversion/conversion_maps";
import { convertXlsxFormat } from "../../src/xlsx/conversion/format_conversion";
import { adaptFormula } from "../../src/xlsx/conversion/formula_conversion";
import { getRelativePath } from "../../src/xlsx/helpers/misc";
import { XLSXImportWarningManager } from "../../src/xlsx/helpers/xlsx_parser_error_manager";
import { XlsxReader } from "../../src/xlsx/xlsx_reader";
import { getTextXlsxFiles } from "../__xlsx__/read_demo_xlsx";
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
} from "../test_helpers/xlsx";

describe("Import xlsx data", () => {
  let convertedData: WorkbookData;
  beforeAll(async () => {
    const demo_xlsx = await getTextXlsxFiles();
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
    [undefined, "F19"], // overflow is the default, no style is needed
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

  test("tables are imported", () => {
    const sheet = getWorkbookSheet("jestTable", convertedData)!;
    expect(sheet.tables).toHaveLength(10);
  });

  test("rows filtered by a table filter are hidden", () => {
    const sheet = getWorkbookSheet("jestTable", convertedData)!;
    expect(sheet.cells["C31"]?.content).toEqual("Hidden");
    expect(sheet.rows[30].isHidden).toBeTruthy();
  });

  describe("table styles", () => {
    /** Test tables for styles are 2x2 tables located at the right of the cell describing them */
    let tableTestSheet: SheetData;
    beforeAll(() => {
      tableTestSheet = getWorkbookSheet("jestTable", convertedData)!;
    });

    test("Can import basic table style", () => {
      const table = tableTestSheet.tables.find((table) => table.range === "C8:D9")!;
      expect(table?.config).toMatchObject({
        numberOfHeaders: 0,
        totalRow: false,
        bandedRows: false,
        bandedColumns: false,
        firstColumn: false,
        lastColumn: false,
        hasFilters: false,
        styleId: "TableStyleLight8",
      });
    });

    test("Can import table style id", () => {
      const table = tableTestSheet.tables.find((table) => table.range === "C3:J6");
      expect(table?.config).toMatchObject({ styleId: "TableStyleLight10" });
    });

    test("Can import table with headers", () => {
      const table = tableTestSheet.tables.find((table) => table.range === "C11:D12");
      expect(table?.config).toMatchObject({ numberOfHeaders: 1 });
    });

    test("Can import table with first column style", () => {
      const table = tableTestSheet.tables.find((table) => table.range === "C14:D15");
      expect(table?.config).toMatchObject({ firstColumn: true });
    });

    test("Can highlight last table column", () => {
      const table = tableTestSheet.tables.find((table) => table.range === "C17:D18");
      expect(table?.config).toMatchObject({ lastColumn: true });
    });

    test("Can import table with banded rows", () => {
      const table = tableTestSheet.tables.find((table) => table.range === "C20:D21");
      expect(table?.config).toMatchObject({ bandedRows: true });
    });

    test("Can import table with banded columns", () => {
      const table = tableTestSheet.tables.find((table) => table.range === "C23:D24");
      expect(table?.config).toMatchObject({ bandedColumns: true });
    });

    test("Can import table with total rows", () => {
      const table = tableTestSheet.tables.find((table) => table.range === "C26:D28");
      expect(table?.config).toMatchObject({ totalRow: true });
    });

    test("Can import table with filters", () => {
      const table = tableTestSheet.tables.find((table) => table.range === "C30:D32");
      expect(table?.config).toMatchObject({ hasFilters: true });
    });

    test("Table with custom style will be converted to default table style", () => {
      const table = tableTestSheet.tables.find((table) => table.range === "C34:D35");
      expect(table?.config).toMatchObject({ styleId: DEFAULT_TABLE_CONFIG.styleId });
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

  // We just import pivots as a Table
  test("can import pivots", () => {
    const testSheet = getWorkbookSheet("jestPivot", convertedData)!;
    const table = testSheet.tables[0];
    expect(table.range).toEqual("C3:L21");
    expect(table.config).toMatchObject({
      numberOfHeaders: 2,
      totalRow: true,
      firstColumn: true,
      lastColumn: true,
      bandedRows: false,
      bandedColumns: false,
      hasFilters: false,
    });
  });

  test.each([
    ["line chart", "C5:G18"],
    ["bar chart", "H5:L18"],
    ["scatter chart", "M5:Q18"],
    ["pie chart", "C38:L56"],
    ["combo chart", "H58:L71"],
    ["doughnut chart", "C19:L37"],
  ])("Can import figures ", (chartTitle, figureZone) => {
    const testSheet = getWorkbookSheet("jestCharts", convertedData)!;
    // Cells in the 1st column of the sheet contains jsons with expected figure data
    const figZone = toZone(figureZone);
    const figure = testSheet.figures.find((figure) => figure.data.title.text === chartTitle)!;

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

  test.each([
    [
      "line",
      [
        { dataRange: "Sheet1!B26:B35", backgroundColor: "#7030A0" },
        { dataRange: "Sheet1!C26:C35", backgroundColor: "#C65911" },
      ],
    ],
    [
      "bar",
      [
        { dataRange: "Sheet1!B27:B35", backgroundColor: "#7030A0" },
        { dataRange: "Sheet1!C27:C35", backgroundColor: "#C65911" },
      ],
    ],
  ])("Can import charts %s with dataset colors", (chartType, chartDatasets) => {
    const testSheet = getWorkbookSheet("jestCharts", convertedData)!;
    const figure = testSheet.figures.find((figure) => figure.data.type === chartType);
    const chartData = figure!.data as LineChartDefinition | BarChartDefinition;
    expect(chartData.dataSets).toEqual(chartDatasets);
  });

  test.each([
    [
      "bar chart",
      "bar",
      "#fff",
      [
        { dataRange: "Sheet1!B27:B35", backgroundColor: "#7030A0" },
        { dataRange: "Sheet1!C27:C35", backgroundColor: "#C65911" },
      ],
    ],
    [
      "combo chart",
      "combo",
      "#fff",
      [
        { dataRange: "Sheet1!B27:B35", backgroundColor: "#1F77B4" },
        { dataRange: "Sheet1!C27:C35", backgroundColor: "#FF7F0E" },
      ],
    ],
  ])(
    "Can import charts %s without dataset titles",
    (chartTitle, chartType, chartColor, chartDatasets) => {
      const testSheet = getWorkbookSheet("jestCharts", convertedData)!;
      const figure = testSheet.figures.find((figure) => figure.data.title.text === chartTitle)!;
      const chartData = figure.data as BarChartDefinition | ComboChartDefinition;
      expect(chartData.title.text).toEqual(chartTitle);
      expect(chartData.type).toEqual(chartType);
      expect(standardizeColor(chartData.background!)).toEqual(standardizeColor(chartColor));

      expect(chartData.labelRange).toEqual("Sheet1!A27:A35");
      expect(chartData.dataSets).toEqual(chartDatasets);
      expect(chartData.dataSetsHaveTitle).toBeFalsy();
    }
  );

  test.each([
    [
      "line chart",
      "line",
      "#CECECE",
      [
        { dataRange: "Sheet1!B26:B35", backgroundColor: "#7030A0" },
        { dataRange: "Sheet1!C26:C35", backgroundColor: "#C65911" },
      ],
    ],
    ["pie chart", "pie", "#fff", [{ dataRange: "Sheet1!B26:B35", backgroundColor: "#1F77B4" }]],
    [
      "doughnut chart",
      "pie",
      "#fff",
      [
        { dataRange: "Sheet1!B26:B35", backgroundColor: "#1F77B4" },
        { dataRange: "Sheet1!C26:C35", backgroundColor: "#1F77B4" },
      ],
    ],
  ])(
    "Can import charts %s with dataset titles",
    (chartTitle, chartType, chartColor, chartDatasets) => {
      const testSheet = getWorkbookSheet("jestCharts", convertedData)!;
      const figure = testSheet.figures.find((figure) => figure.data.title.text === chartTitle)!;
      const chartData = figure.data as LineChartDefinition | PieChartDefinition;
      expect(chartData.title.text).toEqual(chartTitle);
      expect(chartData.type).toEqual(chartType);
      expect(standardizeColor(chartData.background!)).toEqual(standardizeColor(chartColor));

      expect(chartData.labelRange).toEqual("Sheet1!A26:A35");
      expect(chartData.dataSets).toEqual(chartDatasets);
      expect(chartData.dataSetsHaveTitle).toBeTruthy();
    }
  );

  test("Can import scatter plot", () => {
    const testSheet = getWorkbookSheet("jestCharts", convertedData)!;
    const figure = testSheet.figures.find((figure) => figure.data.title.text === "scatter chart")!;
    const chartData = figure.data as ScatterChartDefinition;
    expect(chartData.title.text).toEqual("scatter chart");
    expect(chartData.type).toEqual("scatter");
    expect(standardizeColor(chartData.background!)).toEqual(standardizeColor("#fff"));
    expect(chartData.dataSets).toEqual([{ dataRange: "Sheet1!C27:C35" }]);
    expect(chartData.labelRange).toEqual("Sheet1!B27:B35");
    expect(chartData.dataSetsHaveTitle).toBeFalsy();
  });

  test.each([
    ["chart", "A1:F19"],
    ["image", "H1:K20"],
  ])("Can import figure %s which uses oneCellAnchor", (figureType, figureZone) => {
    const testSheet = getWorkbookSheet("jestOneCellAnchor", convertedData)!;
    const figZone = toZone(figureZone);
    const figure = testSheet.figures.find((figure) => figure.tag === figureType)!;
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
  });

  test("Can import images", () => {
    const testSheet = getWorkbookSheet("jestImages", convertedData)!;
    const figure = testSheet.figures.find((figure) => figure.tag === "image")!;
    const imageData = figure.data as Image;
    expect(imageData.path).toEqual("relative path");
    expect(figure.width).toEqual(figure.height);
  });

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

  test("Import header groups", () => {
    const testSheet = getWorkbookSheet("jestSheet", convertedData)!;
    expect(testSheet.headerGroups?.ROW).toMatchObject([
      { start: 9, end: 17, isFolded: false },
      { start: 11, end: 13, isFolded: true },
    ]);

    expect(testSheet.headerGroups?.COL).toMatchObject([
      { start: 9, end: 17, isFolded: false },
      { start: 11, end: 13, isFolded: true },
    ]);
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
  ["@", PLAIN_TEXT_FORMAT, "0"],
])("convert format %s", async (excelFormat, convertedFormat, expectedValue) => {
  expect(
    convertXlsxFormat(80, [{ id: 80, format: excelFormat }], new XLSXImportWarningManager())
  ).toEqual(convertedFormat);
  expect(formatValue(0, { format: convertedFormat, locale: DEFAULT_LOCALE })).toEqual(
    expectedValue
  );
});
