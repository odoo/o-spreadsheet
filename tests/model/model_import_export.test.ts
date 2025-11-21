import { CellIsRule, Model } from "../../src";
import {
  BACKGROUND_CHART_COLOR,
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  DEFAULT_REVISION_ID,
  FORBIDDEN_SHEETNAME_CHARS,
} from "../../src/constants";
import { toCartesian, toZone } from "../../src/helpers";
import { DEFAULT_TABLE_CONFIG } from "../../src/helpers/table_presets";
import { getCurrentVersion } from "../../src/migrations/data";
import {
  BorderDescr,
  ColorScaleRule,
  DEFAULT_LOCALE,
  DEFAULT_LOCALES,
  IconSetRule,
} from "../../src/types";
import {
  activateSheet,
  resizeColumns,
  resizeRows,
  setCellContent,
  setStyle,
} from "../test_helpers/commands_helpers";
import { FR_LOCALE } from "../test_helpers/constants";
import {
  getBorder,
  getCell,
  getCellContent,
  getEvaluatedCell,
  getMerges,
} from "../test_helpers/getters_helpers";

describe("data", () => {
  test("give default col size if not specified", () => {
    const model = new Model();
    const sheet = model.getters.getActiveSheetId();
    // 96 is default cell width
    expect(model.getters.getColSize(sheet, 0)).toEqual(DEFAULT_CELL_WIDTH);
    expect(model.getters.getColSize(sheet, 1)).toEqual(DEFAULT_CELL_WIDTH);
  });
});

describe("Migrations", () => {
  test("Can upgrade from 1 to 13", () => {
    const model = new Model({
      version: 1,
      sheets: [
        {
          colNumber: 2,
          rowNumber: 2,
          cols: { 0: { size: 42 } },
          rows: { 0: { size: 12 } },
          cells: { A1: { content: "=a1" } },
          name: "My sheet",
          conditionalFormats: [],
        },
      ],
    });
    const data = model.exportData();
    expect(data.version).toBe(getCurrentVersion());
    expect(data.sheets[0].id).toBeDefined();
    expect(data.sheets[0].figures).toBeDefined();
    expect(data.sheets[0].cells.A1).toBe("=A1");
    expect(data.sheets[0].isVisible).toBe(true);
  });
  test("migrate version 5: normalize formulas", () => {
    const model = new Model({
      version: 5,
      sheets: [
        {
          cells: {
            A1: { content: "=A1" },
            A2: { content: "=1" },
            A3: { content: `="hello"` },
            A4: { content: "=A1+A1+A2" },
            A5: { content: `=A1+1+"2"` },
          },
        },
      ],
    });
    const data = model.exportData();
    const cells = data.sheets[0].cells;
    expect(data.version).toBe(getCurrentVersion());
    // formulas are de-normalized with version 9
    expect(cells.A1).toBe("=A1");
    expect(cells.A2).toBe("=1");
    expect(cells.A3).toBe(`="hello"`);
    expect(cells.A4).toBe("=A1+A1+A2");
    expect(cells.A5).toBe(`=A1+1+"2"`);
  });
  test("migrate version 6: charts", () => {
    const model = new Model({
      version: 6,
      sheets: [
        {
          colNumber: 2,
          rowNumber: 2,
          cols: { 0: { size: 42 } },
          rows: { 0: { size: 12 } },
          cells: { A1: { content: "=a1" } },
          name: "My sheet",
          conditionalFormats: [],
          figures: [
            {
              id: "1",
              tag: "chart",
              width: 400,
              height: 300,
              x: 100,
              y: 100,
              data: {
                type: "line",
                title: "demo chart",
                labelRange: "My sheet!A27:A35",
                dataSets: [
                  { labelCell: "My sheet!B26", dataRange: "My sheet!B27:B35" },
                  { labelCell: "My sheet!C26", dataRange: "My sheet!C27:C35" },
                ],
              },
            },
            {
              id: "2",
              tag: "chart",
              width: 400,
              height: 300,
              x: 600,
              y: 100,
              data: {
                type: "bar",
                title: "demo chart 2",
                labelRange: "My sheet!A27:A35",
                dataSets: [
                  { labelCell: undefined, dataRange: "My sheet!B27:B35" },
                  { dataRange: "My sheet!C27:C35" },
                ],
              },
            },
            {
              id: "3",
              tag: "chart",
              width: 400,
              height: 300,
              x: 100,
              y: 500,
              data: {
                type: "bar",
                title: "demo chart 3",
                labelRange: "My sheet!A27",
                dataSets: [{ labelCell: "My sheet!B26", dataRange: "My sheet!B27" }],
              },
            },
            {
              id: "4",
              tag: "chart",
              width: 400,
              height: 300,
              x: 600,
              y: 500,
              data: {
                type: "bar",
                title: "demo chart 4",
                labelRange: "My sheet!A27",
                dataSets: [{ dataRange: "My sheet!B27" }],
              },
            },
          ],
        },
      ],
    });

    const data = model.exportData();
    expect(data.sheets[0].figures[0].data).toEqual({
      chartId: "1",
      type: "line",
      title: { text: "demo chart" },
      labelRange: "'My sheet'!A27:A35",
      dataSets: [{ dataRange: "B26:B35" }, { dataRange: "C26:C35" }],
      dataSetsHaveTitle: true,
      background: BACKGROUND_CHART_COLOR,
      legendPosition: "top",
      stacked: false,
      humanize: true,
    });
    expect(data.sheets[0].figures[1].data).toEqual({
      chartId: "2",
      type: "bar",
      title: { text: "demo chart 2" },
      labelRange: "'My sheet'!A27:A35",
      dataSets: [{ dataRange: "B27:B35" }, { dataRange: "C27:C35" }],
      dataSetsHaveTitle: false,
      background: BACKGROUND_CHART_COLOR,
      legendPosition: "top",
      stacked: false,
      humanize: true,
    });
    expect(data.sheets[0].figures[2].data).toEqual({
      chartId: "3",
      type: "bar",
      title: { text: "demo chart 3" },
      labelRange: "'My sheet'!A27",
      dataSets: [{ dataRange: "B26:B27" }],
      dataSetsHaveTitle: true,
      background: BACKGROUND_CHART_COLOR,
      legendPosition: "top",
      stacked: false,
      humanize: true,
    });
    expect(data.sheets[0].figures[3].data).toEqual({
      chartId: "4",
      type: "bar",
      title: { text: "demo chart 4" },
      labelRange: "'My sheet'!A27",
      dataSets: [{ dataRange: "B27" }],
      dataSetsHaveTitle: false,
      background: BACKGROUND_CHART_COLOR,
      legendPosition: "top",
      stacked: false,
      humanize: true,
    });
  });
  test.each(FORBIDDEN_SHEETNAME_CHARS)("migrate version 7: sheet Names", (char) => {
    const model = new Model({
      version: 7,
      sheets: [
        { name: "My sheet" },
        {
          name: `sheetName${char}`,
          cells: { A1: { formula: { text: "=|0|", dependencies: [`sheetName${char}!A2`] } } },
          figures: [
            {
              id: "1",
              x: 0,
              y: 0,
              width: 100,
              height: 100,
              tag: "chart",
              data: {
                dataSets: [`sheetName${char}!A1:A2`, `My sheet!A1:A2`],
                dataSetsHaveTitle: true,
                labelRange: `sheetName${char}!B1:B2`,
                type: "bar",
              },
            },
          ],
          conditionalFormats: [
            {
              id: 1,
              ranges: [`sheetName${char}!A1:A2`],
              rule: {
                type: "ColorScaleRule",
                maximum: { type: "formula", value: `=sheetName${char}!B1`, color: 16711680 },
                midpoint: { type: "formula", value: `=sheetName${char}!B1`, color: 16711680 },
                minimum: { type: "formula", value: `=sheetName${char}!B1`, color: 16711680 },
              },
            },
            {
              id: 2,
              ranges: ["D5:D6"],
              rule: {
                type: "IconSetRule",
                icons: { upper: "arrowGood", middle: "dotNeutral", lower: "arrowBad" },
                lowerInflectionPoint: {
                  type: "formula",
                  value: `=sheetName${char}!B1`,
                  operator: "gt",
                },
                upperInflectionPoint: {
                  type: "formula",
                  value: `=sheetName${char}!B1`,
                  operator: "gt",
                },
              },
            },
            {
              id: 3,
              ranges: [`sheetName${char}!A1:A2`],
              rule: {
                type: "ColorScaleRule",
                minimum: { type: "percentage", value: "33", color: 16711680 },
                midpoint: { type: "number", value: "13", color: 16711680 },
                maximum: { type: "value", color: 16711680 },
              },
            },
          ],
        },
      ],
    });
    const data = model.exportData();
    expect(data.sheets[0].name).toBe("My sheet");
    expect(data.sheets[1].name).toBe("sheetName_");

    const cells = data.sheets[1].cells;
    expect(cells.A1!).toBe("=sheetName_!A2");

    const figures = data.sheets[1].figures;
    expect(figures[0].data?.dataSets).toEqual([
      { dataRange: "A1:A2" },
      { dataRange: "'My sheet'!A1:A2" },
    ]);
    expect(figures[0].data?.labelRange).toBe("sheetName_!B1:B2");

    const cfs = data.sheets[1].conditionalFormats;
    const rule1 = cfs[0].rule as ColorScaleRule;
    expect(cfs[0].ranges).toEqual(["sheetName_!A1:A2"]);
    expect(rule1.minimum.value).toEqual("=sheetName_!B1");
    expect(rule1.midpoint?.value).toEqual("=sheetName_!B1");
    expect(rule1.maximum.value).toEqual("=sheetName_!B1");

    const rule2 = cfs[1].rule as IconSetRule;
    expect(cfs[1].ranges).toEqual(["D5:D6"]);
    expect(rule2.lowerInflectionPoint.value).toEqual("=sheetName_!B1");
    expect(rule2.upperInflectionPoint.value).toEqual("=sheetName_!B1");

    const rule3 = cfs[2].rule as ColorScaleRule;
    expect(cfs[2].ranges).toEqual(["sheetName_!A1:A2"]);
    expect(rule3.minimum.value).toEqual("33");
    expect(rule3.midpoint?.value).toEqual("13");
    expect(rule3.maximum.value).toBeUndefined();
  });

  test("migrate version 7: duplicated sheet Names without forbidden characters", () => {
    const model = new Model({
      version: 7,
      sheets: [
        { name: "My sheet?" },
        { name: "My sheet]" },
        { name: "My sheet[" },
        { name: "?" },
        { name: "*" },
        { name: "__" },
        { name: "[]" },
      ],
    });
    const data = model.exportData();
    expect(data.sheets[0].name).toBe("My sheet_");
    expect(data.sheets[1].name).toBe("My sheet_1");
    expect(data.sheets[2].name).toBe("My sheet_2");
    expect(data.sheets[3].name).toBe("_");
    expect(data.sheets[4].name).toBe("_1");
    expect(data.sheets[5].name).toBe("__");
    expect(data.sheets[6].name).toBe("__1");
  });

  test("migrate version 9: de-normalize formulas", () => {
    const model = new Model({
      version: 9,
      sheets: [
        {
          cells: {
            A1: { content: "1" },
            A2: { formula: { text: "=|0|+|1|", dependencies: ["A1", "A3"] } },
          },
        },
      ],
    });
    const data = model.exportData();
    expect(data.sheets[0].cells.A1).toBe("1");
    expect(data.sheets[0].cells.A2).toBe("=A1+A3");
  });

  test("migrate version 10: normalized cell formats", () => {
    const model = new Model({
      version: 10,
      sheets: [
        {
          id: "1",
          colNumber: 10,
          rowNumber: 10,
          cells: { A1: { content: "1000", format: "#,##0" }, A2: { content: "1000" } },
        },
        {
          id: "2",
          colNumber: 10,
          rowNumber: 10,
          cells: {
            A1: { content: "21000", format: "#,##0" },
            A2: { content: "12-31-2020", format: "mm/dd/yyyy" },
          },
        },
      ],
    });
    const data = model.exportData();
    expect(data.formats).toEqual({
      "1": "#,##0",
      "2": "mm/dd/yyyy",
    });
    expect(data.sheets[0].formats["A1"]).toEqual(1);
    expect(data.sheets[0].formats["A2"]).toBeUndefined();
    expect(data.sheets[1].formats["A1"]).toEqual(1);
    expect(data.sheets[1].formats["A2"]).toEqual(2);
  });

  test("migrate version 12: Fix Overlapping datafilters", () => {
    const model = new Model({
      version: 12,
      sheets: [
        {
          id: "1",
          filterTables: [{ range: "A1:B2" }, { range: "A1:C2" }],
        },
      ],
    });
    const data = model.exportData();
    expect(data.sheets[0].tables).toEqual([
      {
        range: "A1:C2",
        type: "static",
        config: { ...DEFAULT_TABLE_CONFIG, hasFilters: true },
      },
    ]);
  });

  test("migrate version 12.5: update border description structure", () => {
    const model = new Model({
      version: 12.5,
      sheets: [
        {
          id: "1",
          cells: {
            A1: {
              border: 1,
            },
          },
        },
      ],
      borders: {
        1: {
          top: ["thin", "#000"],
        },
      },
    });
    const data = model.exportData();
    expect(data.borders).toEqual({
      1: {
        top: {
          style: "thin",
          color: "#000",
        },
        horizontal: {
          style: "thin",
          color: "#000",
        },
      },
    });
  });

  test("migrate version 14: set locale of spreadsheet to en_US", () => {
    const model = new Model({ version: 13 });
    const data = model.exportData();
    expect(data.settings).toEqual({ locale: DEFAULT_LOCALE });
  });

  test("migrate version 14.5: Fix Overlapping datafilters", () => {
    const model = new Model({
      version: 14,
      sheets: [
        {
          id: "1",
          filterTables: [{ range: "A1:B2" }, { range: "A1:C2" }],
        },
      ],
    });
    const data = model.exportData();
    expect(data.version).toEqual(getCurrentVersion());
    expect(parseFloat(getCurrentVersion())).toBeGreaterThanOrEqual(14.5);
    expect(data.sheets[0].tables).toEqual([
      {
        range: "A1:C2",
        type: "static",
        config: { ...DEFAULT_TABLE_CONFIG, hasFilters: true },
      },
    ]);
  });

  test("migrate version 15: filterTables are renamed into tables", () => {
    const model = new Model({
      version: 14.5,
      sheets: [
        {
          id: "1",
          filterTables: [{ range: "A1:B2" }],
        },
      ],
    });
    expect(model.getters.getTables("1")).toMatchObject([{ range: { zone: toZone("A1:B2") } }]);
    const data = model.exportData();
    expect(data.version).toBe(getCurrentVersion());
    expect(data.sheets[0].tables).toEqual([
      {
        range: "A1:B2",
        type: "static",
        config: { ...DEFAULT_TABLE_CONFIG, hasFilters: true },
      },
    ]);
  });

  test("migrate version 21: style,format and borders by zones", () => {
    const style = { bold: true };
    const border = {
      top: { style: "thin", color: "#000" } as BorderDescr,
    };
    const model = new Model({
      version: 20,
      sheets: [
        {
          id: "1",
          cells: {
            A1: { content: "hi", style: 1, format: 2, border: 3 },
          },
        },
      ],
      styles: { 1: style },
      formats: { 2: "0.00%" },
      borders: { 3: border },
    });
    expect(getCell(model, "A1")?.format).toBe("0.00%");
    expect(getCell(model, "A1")?.style).toEqual(style);
    expect(getBorder(model, "A1")).toEqual({ top: { style: "thin", color: "#000" } });
    const data = model.exportData();
    expect(data.version).toBe(getCurrentVersion());
    expect(data.sheets[0].cells).toEqual({ A1: "hi" });
    expect(data.sheets[0].formats).toEqual({ A1: 1 });
    expect(data.sheets[0].styles).toEqual({ A1: 1 });
    expect(data.sheets[0].borders).toEqual({ A1: 1 });
    expect(data.formats).toEqual({ 1: "0.00%" });
    expect(data.styles).toEqual({ 1: style });
    expect(data.borders).toEqual({
      1: { top: { style: "thin", color: "#000" }, horizontal: { style: "thin", color: "#000" } },
    });
  });

  test("Migrate version 22: add inflection operator to gauge chart", () => {
    const model = new Model({
      version: 19,
      sheets: [
        {
          id: "1",
          figures: [
            {
              id: "5",
              tag: "chart",
              data: {
                type: "gauge",
                background: "#FFFFFF",
                sectionRule: {
                  colors: { lowerColor: "#cc0000", middleColor: "#f1c232", upperColor: "#6aa84f" },
                  rangeMin: "0",
                  rangeMax: "100",
                  lowerInflectionPoint: { type: "percentage", value: "15" },
                  upperInflectionPoint: { type: "percentage", value: "40" },
                },
                title: { text: "Gauge" },
                dataRange: "Sheet1!B29",
              },
            },
          ],
        },
      ],
    });
    expect(model.getters.getChartDefinition("5")).toMatchObject({
      sectionRule: {
        colors: { lowerColor: "#cc0000", middleColor: "#f1c232", upperColor: "#6aa84f" },
        rangeMin: "0",
        rangeMax: "100",
        lowerInflectionPoint: { type: "percentage", value: "15", operator: "<=" },
        upperInflectionPoint: { type: "percentage", value: "40", operator: "<=" },
      },
    });
  });

  test("migrate version 23: tables no longer have filters by default", () => {
    const model = new Model({
      version: 22,
      sheets: [
        {
          id: "1",
          tables: [{ range: "A1:B2" }],
        },
      ],
    });
    expect(model.getters.getTables("1")).toMatchObject([{ range: { zone: toZone("A1:B2") } }]);
    const data = model.exportData();
    expect(data.version).toBe(getCurrentVersion());
    expect(data.sheets[0].tables).toEqual([
      {
        range: "A1:B2",
        type: "static",
        config: { ...DEFAULT_TABLE_CONFIG, hasFilters: true },
      },
    ]);
  });

  test("migrate version 24: flatten cell object", () => {
    const model = new Model({
      version: 23,
      sheets: [
        {
          id: "1",
          cells: { A1: { content: "Hello" } },
        },
      ],
    });
    expect(getCellContent(model, "A1")).toBe("Hello");
  });

  test("migration 18.3: drop sorted column if not part of measure", () => {
    const data = {
      version: 24,
      pivots: {
        1: {
          type: "SPREADSHEET",
          columns: [],
          domain: [],
          measures: [{ id: "probability:sum", fieldName: "probability", aggregator: "sum" }],
          model: "partner",
          rows: [{ fieldName: "bar" }],
          sortedColumn: {
            measure: "foo",
            order: "asc",
          },
          name: "A pivot",
          formulaId: "1",
        },
        2: {
          type: "SPREADSHEET",
          columns: [],
          domain: [],
          measures: [{ id: "probability:sum", fieldName: "probability", aggregator: "sum" }],
          model: "partner",
          rows: [{ fieldName: "bar" }],
          sortedColumn: {
            measure: "probability:sum",
            order: "asc",
          },
          name: "A pivot",
          formulaId: "2",
        },
      },
    };
    const model = new Model(data);
    expect(model.getters.getPivot("1").definition.sortedColumn).toBe(undefined);
    expect(model.getters.getPivot("2").definition.sortedColumn).toEqual(
      data.pivots["2"].sortedColumn
    ); // unchanged
  });

  test("migrate version 18.4.1: convert cf types", () => {
    const oldCfTypes = [
      "BeginsWith",
      "Between",
      "ContainsText",
      "EndsWith",
      "Equal",
      "GreaterThan",
      "GreaterThanOrEqual",
      "IsEmpty",
      "IsNotEmpty",
      "LessThan",
      "LessThanOrEqual",
      "NotBetween",
      "NotContains",
      "NotEqual",
    ];
    const conditionalFormats: any[] = [];
    for (const index in oldCfTypes) {
      conditionalFormats.push({
        id: index,
        ranges: ["A1"],
        rule: { type: "CellIsRule", values: ["42"], style: {}, operator: oldCfTypes[index] },
      });
    }
    const model = new Model({
      version: "18.3.1",
      sheets: [{ conditionalFormats }],
    });

    const migratedTypes = model.getters
      .getConditionalFormats(model.getters.getActiveSheetId())
      .map((cf) => (cf.rule as CellIsRule).operator);

    expect(migratedTypes).toEqual([
      "beginsWithText",
      "isBetween",
      "containsText",
      "endsWithText",
      "isEqual",
      "isGreaterThan",
      "isGreaterOrEqualTo",
      "isEmpty",
      "isNotEmpty",
      "isLessThan",
      "isLessOrEqualTo",
      "isNotBetween",
      "notContainsText",
      "isNotEqual",
    ]);
  });

  test("migrate version 18.4.1: convert dv types", () => {
    const oldDvTypes = ["textContains", "textNotContains", "textIs", "textIsEmail", "textIsLink"];
    const dvs: any[] = [];
    for (const index in oldDvTypes) {
      dvs.push({
        id: index,
        ranges: ["A1"],
        criterion: { type: oldDvTypes[index], values: ["42"] },
      });
    }
    const model = new Model({
      version: "18.3.1",
      sheets: [{ dataValidationRules: dvs }],
    });

    const migratedTypes = model.getters
      .getDataValidationRules(model.getters.getActiveSheetId())
      .map((dv) => dv.criterion.type);

    expect(migratedTypes).toEqual([
      "containsText",
      "notContainsText",
      "isEqualText",
      "isEmail",
      "isLink",
    ]);
  });

  test("migrate version 18.4.3: clean pivot sorted column", () => {
    const data = {
      version: "18.4.2",
      pivots: {
        1: {
          type: "SPREADSHEET",
          columns: [],
          domain: [],
          measures: [{ id: "probability:sum", fieldName: "probability", aggregator: "sum" }],
          model: "partner",
          rows: [],
          sortedColumn: {
            measure: "probability", // should be "probability:sum"
            order: "asc",
            domain: [],
          },
          name: "A pivot",
          formulaId: "1",
        },
        2: {
          type: "SPREADSHEET",
          columns: [],
          domain: [],
          measures: [{ id: "probability:sum", fieldName: "probability", aggregator: "sum" }],
          model: "partner",
          rows: [],
          sortedColumn: {
            measure: "probability:sum", // correct
            order: "asc",
            domain: [],
          },
          name: "A pivot",
          formulaId: "2",
        },
      },
    };
    const model = new Model(data);
    expect(model.getters.getPivot("1").definition.sortedColumn?.measure).toBe("probability:sum");
    expect(model.getters.getPivot("2").definition.sortedColumn?.measure).toBe("probability:sum");
  });
});

test("migrate version 18.5.1: chartId is added to figure data", () => {
  const data = {
    version: "18.4.2",
    sheets: [
      {
        id: "sh1",
        figures: [
          {
            id: "someuuid",
            tag: "chart",
            data: { type: "line", title: "demo chart", labelRange: "", dataSets: [] },
          },
        ],
      },
    ],
  };
  const model = new Model(data);
  expect(model.exportData().sheets[0].figures[0].data.chartId).toBe("someuuid");
});

describe("Import", () => {
  test("Import sheet with rows/cols size defined.", () => {
    const model = new Model({
      sheets: [
        { colNumber: 2, rowNumber: 2, cols: { 0: { size: 42 } }, rows: { 1: { size: 13 } } },
      ],
    });
    const sheet = model.getters.getActiveSheetId();
    expect(model.getters.getColSize(sheet, 0)).toBe(42);
    expect(model.getters.getColSize(sheet, 1)).toBe(DEFAULT_CELL_WIDTH);
    expect(model.getters.getRowSize(sheet, 0)).toBe(DEFAULT_CELL_HEIGHT);
    expect(model.getters.getRowSize(sheet, 1)).toBe(13);
  });

  test("Import 2 sheets with merges", () => {
    const model = new Model({
      sheets: [
        { colNumber: 2, rowNumber: 2, merges: ["A2:B2"] },
        { colNumber: 2, rowNumber: 2 },
      ],
    });
    const sheet1 = model.getters.getSheetIds()[0];
    const sheet2 = model.getters.getSheetIds()[1];
    activateSheet(model, sheet2);
    expect(Object.keys(getMerges(model))).toHaveLength(0);
    activateSheet(model, sheet1);
    expect(Object.keys(getMerges(model))).toHaveLength(1);
    expect(getMerges(model)[1]).toMatchObject(toZone("A2:B2"));
  });

  test("can import cell without content", () => {
    const model = new Model({
      sheets: [{ id: "1", formats: { A1: 1 } }],
      formats: { 1: "0.00%" },
    });
    expect(getCell(model, "A1")?.content).toBe("");
    expect(getCell(model, "A1")?.format).toBe("0.00%");
  });
});

describe("Export", () => {
  test("Can export col size", () => {
    const model = new Model({ sheets: [{ colNumber: 10, rowNumber: 10 }] });
    resizeColumns(model, ["B"], 150);
    const exp = model.exportData();
    expect(exp.sheets![0].cols![1].size).toBe(150);
  });

  test("Can export row size", () => {
    const model = new Model({ sheets: [{ colNumber: 10, rowNumber: 10 }] });
    resizeRows(model, [1], 150);
    const exp = model.exportData();
    expect(exp.sheets![0].rows![1].size).toBe(150);
  });

  test("Can export merges", () => {
    const model = new Model({
      sheets: [{ colNumber: 10, rowNumber: 10, merges: ["A1:A2", "B1:C1", "D1:E2"] }],
    });
    const exp = model.exportData();
    expect(exp.sheets![0].merges).toHaveLength(3);
  });

  test("Can export format", () => {
    const model = new Model({
      sheets: [{ colNumber: 10, rowNumber: 10, cells: { A1: "145" }, formats: { A1: 1 } }],
      formats: { 1: "0.00%" },
    });
    const exp = model.exportData();
    expect(exp.sheets[0].formats.A1).toBe(1);
  });

  test("empty content is not exported", () => {
    const model = new Model();
    setStyle(model, "A1", { fillColor: "#123456" });
    const exp = model.exportData();
    expect(exp.sheets[0].styles.A1).toEqual(1);
  });

  test("chart figures without a definition are not exported", () => {
    const model = new Model({
      sheets: [
        {
          id: "someuuid",
          figures: [
            {
              id: "otheruuid",
              x: 100,
              y: 100,
              width: 100,
              height: 100,
              tag: "chart",
              data: {
                type: "line",
                title: "demo chart",
                labelRange: "A1:A4",
                dataSets: [{ dataRange: "B1:B4" }, { dataRange: "C1:C4" }],
              },
            },
            { id: "id2", x: 100, y: 100, width: 100, height: 100 },
          ],
        },
      ],
    });
    model.dispatch("DELETE_FIGURE", { figureId: "otheruuid", sheetId: "someuuid" });
    expect(model.exportData()).toMatchObject({
      sheets: [
        {
          id: "someuuid",
          figures: [
            {
              id: "id2",
              x: 100,
              y: 100,
              width: 100,
              height: 100,
            },
          ],
        },
      ],
    });
  });
});

test("complete import, then export", () => {
  const modelData = {
    version: getCurrentVersion(),
    revisionId: DEFAULT_REVISION_ID,
    sheets: [
      {
        id: "someuuid",
        colNumber: 10,
        rowNumber: 10,
        merges: ["A1:A2"],
        cols: {
          0: { size: 42 },
        },
        rows: {
          1: { size: 13 },
        },
        cells: {
          A1: "hello",
          B1: "=A1",
          C1: "=mqdlskjfqmslfkj(++%//@@@)",
          D1: '="This is a quote \\""',
        },
        styles: {
          B1: 1,
          "D1:D2": 1,
        },
        formats: {
          B1: 1,
          "D1:D2": 1,
        },
        borders: {
          A1: 1,
          B1: 2,
        },
        name: "My sheet",
        conditionalFormats: [],
        dataValidationRules: [],
        figures: [],
        tables: [],
        areGridLinesVisible: true,
        isVisible: true,
        panes: { ySplit: 1, xSplit: 5 },
        headerGroups: { COL: [], ROW: [] },
      },
      {
        id: "someuuid_2",
        colNumber: 10,
        rowNumber: 10,
        merges: [],
        cols: {},
        rows: {},
        cells: {
          A1: "hello",
        },
        styles: {},
        formats: {},
        borders: {},
        name: "My sheet 2",
        conditionalFormats: [],
        dataValidationRules: [],
        figures: [],
        tables: [],
        areGridLinesVisible: false,
        isVisible: true,
        headerGroups: { COL: [], ROW: [] },
      },
    ],
    pivots: {},
    pivotNextId: 1,
    settings: { locale: DEFAULT_LOCALE },
    customTableStyles: {},
    styles: {
      1: { bold: true, textColor: "#674EA7", fontSize: 12 },
    },
    formats: {
      1: "0.00%",
    },
    borders: {
      1: {
        top: { style: "thin", color: "#000" } as BorderDescr,
      },
      2: {
        top: { style: "medium", color: "#000" } as BorderDescr,
      },
    },
    uniqueFigureIds: true,
  };
  const model = new Model(modelData);
  expect(model).toExport(modelData);
  // We test here a that two import with the same data give the same result.
  const model2 = new Model(modelData);
  expect(model2.exportData()).toEqual(modelData);
});

test("can import cells outside sheet size", () => {
  const sheetId = "someuuid";
  const modelData = {
    version: getCurrentVersion(),
    sheets: [
      {
        id: sheetId,
        colNumber: 10,
        rowNumber: 10,
        cols: {},
        rows: {},
        cells: {
          Z100: "hello",
        },
      },
    ],
  };
  const model = new Model(modelData);
  expect(model.getters.getNumberRows(sheetId)).toBe(100);
  expect(model.getters.getNumberCols(sheetId)).toBe(26);
  const { col, row } = toCartesian("Z100");

  expect(model.getters.getCell({ sheetId, col, row })?.content).toBe("hello");
});

test("Data of a duplicate sheet are correctly duplicated", () => {
  const model = new Model();
  setCellContent(model, "A1", "hello");
  const sheetId = model.getters.getActiveSheetId();
  model.dispatch("DUPLICATE_SHEET", { sheetId, sheetIdTo: "42", sheetNameTo: "Copy of Sheet1" });
  expect(getCellContent(model, "A1", sheetId)).toBe("hello");
  expect(getCellContent(model, "A1", "42")).toBe("hello");
  const data = model.exportData();
  expect(Object.keys(data.sheets[0].cells)).toHaveLength(1);
  expect(Object.keys(data.sheets[1].cells)).toHaveLength(1);
});

test("import then export (figures)", () => {
  const modelData = {
    version: getCurrentVersion(),
    revisionId: DEFAULT_REVISION_ID,
    sheets: [
      {
        id: "someuuid",
        colNumber: 10,
        rowNumber: 10,
        merges: [],
        cols: {},
        rows: {},
        cells: {},
        styles: {},
        formats: {},
        borders: {},
        name: "My sheet",
        conditionalFormats: [],
        dataValidationRules: [],
        figures: [
          {
            id: "otheruuid",
            offset: { x: 10, y: 10 },
            col: 1,
            row: 1,
            width: 100,
            height: 100,
          },
        ],
        tables: [],
        areGridLinesVisible: true,
        isVisible: true,
        headerGroups: { COL: [], ROW: [] },
      },
    ],
    pivots: {},
    pivotNextId: 1,
    styles: {},
    formats: {},
    borders: {},
    uniqueFigureIds: true,
    settings: { locale: DEFAULT_LOCALE },
    customTableStyles: {},
  };
  const model = new Model(modelData);
  expect(model).toExport(modelData);
});

test("import date as string and detect the format", () => {
  const model = new Model({
    sheets: [
      {
        cells: { A1: "12/31/2020" },
      },
    ],
  });
  expect(getCell(model, "A1")?.format).toBe("m/d/yyyy");
  expect(getCell(model, "A1")?.content).toBe("44196");
  expect(getEvaluatedCell(model, "A1")?.formattedValue).toBe("12/31/2020");
});

test("import localized date as string and detect the format", () => {
  const model = new Model({
    sheets: [
      {
        cells: { A1: "31/12/2020" },
      },
    ],
    settings: { locale: FR_LOCALE },
  });
  expect(getCell(model, "A1")?.format).toBe("d/m/yyyy");
  expect(getCell(model, "A1")?.content).toBe("44196");
  expect(getEvaluatedCell(model, "A1")?.formattedValue).toBe("31/12/2020");
});

test("Week start is automatically added during migration", () => {
  expect(
    new Model({
      version: 19,
      settings: { locale: { ...DEFAULT_LOCALES[1], weekStart: undefined } },
    }).exportData().settings.locale.weekStart
  ).toBe(1);
  expect(
    new Model({
      version: 19,
      settings: { locale: { ...DEFAULT_LOCALES[0], weekStart: undefined } },
    }).exportData().settings.locale.weekStart
  ).toBe(7);
});

test("Can import spreadsheet with only version", () => {
  new Model({ version: 1 });
  // We expect the model to be loaded without traceback
  expect(true).toBeTruthy();
});
