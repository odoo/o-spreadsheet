import { CommandResult, Model } from "../../../src";
import { deepCopy, zoneToXc } from "../../../src/helpers";
import {
  GaugeChartDefinition,
  GaugeChartRuntime,
  SectionRule,
} from "../../../src/types/chart/gauge_chart";
import {
  addColumns,
  createGaugeChart,
  createSheet,
  deleteSheet,
  redo,
  selectCell,
  setCellContent,
  undo,
  updateChart,
} from "../../test_helpers/commands_helpers";
import { GaugeChart } from "./../../../src/helpers/figures/charts/gauge_chart";

let model: Model;

const lowerColor = "#6aa84f";
const middleColor = "#f1c232";
const upperColor = "#cc0000";

const defaultSectionRule: SectionRule = {
  rangeMin: "0",
  rangeMax: "100",
  colors: {
    lowerColor,
    middleColor,
    upperColor,
  },
  lowerInflectionPoint: {
    type: "number",
    value: "33",
  },
  upperInflectionPoint: {
    type: "number",
    value: "66",
  },
};

const randomSectionRule: SectionRule = {
  rangeMin: "-200",
  rangeMax: "500",
  colors: {
    lowerColor: "#111111",
    middleColor: "#999999",
    upperColor: "#dddddd",
  },
  lowerInflectionPoint: {
    type: "percentage",
    value: "50",
  },
  upperInflectionPoint: {
    type: "number",
    value: "70",
  },
};

beforeEach(() => {
  model = new Model({
    sheets: [
      {
        name: "Sheet1",
        colNumber: 10,
        rowNumber: 10,
        rows: {},
        cells: {},
      },
    ],
  });
});

describe("datasource tests", function () {
  test("create a gauge chart", () => {
    createGaugeChart(
      model,
      {
        dataRange: "B8",
        title: "Title",
        sectionRule: randomSectionRule,
      },
      "1"
    );
    expect(model.getters.getChartDefinition("1") as GaugeChartDefinition).toMatchObject({
      dataRange: "B8",
      type: "gauge",
      title: "Title",
      sectionRule: randomSectionRule,
    });
    expect(model.getters.getChartRuntime("1") as GaugeChartRuntime).toMatchSnapshot();
  });

  test("create empty gauge chart", () => {
    createGaugeChart(
      model,
      {
        dataRange: "A1",
      },
      "1"
    );
    expect(model.getters.getChartDefinition("1") as GaugeChartDefinition).toMatchObject({
      type: "gauge",
      dataRange: "A1",
      title: "",
      sectionRule: defaultSectionRule,
    });
    expect(model.getters.getChartRuntime("1") as GaugeChartRuntime).toMatchSnapshot();
  });

  test("ranges in gauge definition change automatically", () => {
    createGaugeChart(
      model,
      {
        dataRange: "Sheet1!B1:B4",
      },
      "1"
    );
    addColumns(model, "before", "A", 2);
    const chart = model.getters.getChartDefinition("1") as GaugeChartDefinition;
    expect(chart.dataRange).toStrictEqual("Sheet1!D1:D4");
  });

  test("can delete an imported gauge chart", () => {
    createGaugeChart(
      model,
      {
        dataRange: "B7:B8",
      },
      "1"
    );
    const exportedData = model.exportData();
    const newModel = new Model(exportedData);
    expect(newModel.getters.getVisibleFigures()).toHaveLength(1);
    expect(newModel.getters.getChartRuntime("1") as GaugeChartRuntime).toBeTruthy();
    newModel.dispatch("DELETE_FIGURE", { sheetId: model.getters.getActiveSheetId(), id: "1" });
    expect(newModel.getters.getVisibleFigures()).toHaveLength(0);
    expect(() => newModel.getters.getChartRuntime("1")).toThrow();
  });

  test("update gauge chart", () => {
    createGaugeChart(
      model,
      {
        dataRange: "B7:B8",
      },
      "1"
    );
    updateChart(model, "1", {
      dataRange: "A7",
      title: "hello1",
      sectionRule: randomSectionRule,
    });
    expect(model.getters.getChartDefinition("1") as GaugeChartDefinition).toMatchObject({
      dataRange: "A7",
      title: "hello1",
      sectionRule: randomSectionRule,
    });
  });

  test("create gauge chart with invalid ranges", () => {
    let result = createGaugeChart(
      model,
      {
        dataRange: "this is invalid",
      },
      "1"
    );
    expect(result).toBeCancelledBecause(CommandResult.InvalidGaugeDataRange);
  });

  describe("create gauge chart with invalid section rule", () => {
    let sectionRule: SectionRule;
    let model: Model;
    beforeEach(() => {
      sectionRule = deepCopy(defaultSectionRule);
      model = new Model({
        sheets: [
          {
            name: "Sheet1",
            colNumber: 10,
            rowNumber: 10,
            rows: {},
            cells: {},
          },
        ],
      });
    });

    test("empty rangeMin", async () => {
      sectionRule = {
        ...sectionRule,
        rangeMin: "",
      };
      const result = createGaugeChart(
        model,
        {
          dataRange: "A1",
          sectionRule,
        },
        "1"
      );
      expect(result).toBeCancelledBecause(CommandResult.EmptyGaugeRangeMin);
    });

    test("NaN rangeMin", async () => {
      sectionRule = {
        ...sectionRule,
        rangeMin: "I'm not a number",
      };
      const result = createGaugeChart(
        model,
        {
          dataRange: "A1",
          sectionRule,
        },
        "1"
      );
      expect(result).toBeCancelledBecause(CommandResult.GaugeRangeMinNaN);
    });

    test("empty rangeMax", async () => {
      sectionRule = {
        ...sectionRule,
        rangeMax: "",
      };
      const result = createGaugeChart(
        model,
        {
          dataRange: "A1",
          sectionRule,
        },
        "1"
      );
      expect(result).toBeCancelledBecause(CommandResult.EmptyGaugeRangeMax);
    });

    test("NaN rangeMax", async () => {
      sectionRule = {
        ...sectionRule,
        rangeMax: "I'm not a number",
      };
      const result = createGaugeChart(
        model,
        {
          dataRange: "A1",
          sectionRule,
        },
        "1"
      );
      expect(result).toBeCancelledBecause(CommandResult.GaugeRangeMaxNaN);
    });

    test("rangeMin > rangeMax", async () => {
      sectionRule = {
        ...sectionRule,
        rangeMin: "100",
        rangeMax: "0",
      };
      const result = createGaugeChart(
        model,
        {
          dataRange: "A1",
          sectionRule,
        },
        "1"
      );
      expect(result).toBeCancelledBecause(CommandResult.GaugeRangeMinBiggerThanRangeMax);
    });

    test("NaN LowerInflectionPoint", async () => {
      sectionRule = {
        ...sectionRule,
        lowerInflectionPoint: {
          ...sectionRule.lowerInflectionPoint,
          value: "I'm not a number",
        },
      };
      const result = createGaugeChart(
        model,
        {
          dataRange: "A1",
          sectionRule,
        },
        "1"
      );
      expect(result).toBeCancelledBecause(CommandResult.GaugeLowerInflectionPointNaN);
    });

    test("NaN UpperInflectionPoint", async () => {
      sectionRule = {
        ...sectionRule,
        upperInflectionPoint: {
          ...sectionRule.upperInflectionPoint,
          value: "I'm not a number",
        },
      };
      const result = createGaugeChart(
        model,
        {
          dataRange: "A1",
          sectionRule,
        },
        "1"
      );
      expect(result).toBeCancelledBecause(CommandResult.GaugeUpperInflectionPointNaN);
    });
  });

  test("Gauge Chart is deleted on sheet deletion", () => {
    model.dispatch("CREATE_SHEET", { sheetId: "2", position: 1 });
    createGaugeChart(
      model,
      {
        dataRange: "Sheet1!B1:B4",
      },
      "1",
      "2"
    );
    expect(model.getters.getChartRuntime("1") as GaugeChartRuntime).not.toBeUndefined();
    model.dispatch("DELETE_SHEET", { sheetId: "2" });
    expect(() => model.getters.getChartRuntime("1")).toThrow();
  });

  test("Gauge chart is copied on sheet duplication", () => {
    const firstSheetId = model.getters.getActiveSheetId();
    const secondSheetId = "42";
    createGaugeChart(
      model,
      {
        title: "test",
        dataRange: "B1:B4",
        sectionRule: randomSectionRule,
      },
      firstSheetId
    );
    const figure = model.getters.getFigures(firstSheetId)[0]!;
    model.dispatch("DUPLICATE_SHEET", {
      sheetIdTo: secondSheetId,
      sheetId: firstSheetId,
    });

    expect(model.getters.getFigures(secondSheetId)).toHaveLength(1);
    const duplicatedFigure = model.getters.getFigures(secondSheetId)[0];
    const duplicatedChart = model.getters.getChart(duplicatedFigure.id) as GaugeChart;

    expect(duplicatedChart.title).toEqual("test");
    expect(zoneToXc(duplicatedChart.dataRange!.zone)).toEqual("B1:B4");
    expect(duplicatedChart.dataRange!.sheetId).toEqual(secondSheetId);

    expect(duplicatedFigure).toMatchObject({ ...figure, id: expect.any(String) });
    expect(duplicatedFigure.id).not.toBe(figure?.id);
    // duplicated chart is not deleted if original sheet is deleted
    deleteSheet(model, firstSheetId);
    expect(model.getters.getSheetIds()).toHaveLength(1);
    expect(model.getters.getFigures(secondSheetId)).toEqual([duplicatedFigure]);
  });
});

describe("multiple sheets", () => {
  beforeEach(() => {
    model = new Model({
      sheets: [
        {
          name: "Sheet1",
          cells: {
            B1: { content: "1" },
          },
          figures: [
            {
              id: "1",
              tag: "chart",
              width: 400,
              height: 300,
              x: 100,
              y: 100,
              data: {
                type: "gauge",
                title: "demo chart",
                dataRange: "Sheet2!A1",
                sectionRule: { ...defaultSectionRule },
              },
            },
          ],
        },
        {
          name: "Sheet2",
          cells: {
            A1: { content: "=Sheet1!B1*2" },
          },
        },
      ],
    });
  });

  test("create a gauge chart with data from another sheet", () => {
    createSheet(model, { sheetId: "42", activate: true });
    createGaugeChart(
      model,
      {
        dataRange: "Sheet1!B1",
      },
      "28"
    );
    const chart = model.getters.getChartDefinition("28") as GaugeChartDefinition;
    expect(chart.dataRange).toEqual("Sheet1!B1");
  });
});

describe("undo/redo", () => {
  test("undo/redo gauge chart creation", () => {
    const before = model.exportData();
    createGaugeChart(model, { dataRange: "Sheet1!B1:B4" });
    const after = model.exportData();
    undo(model);
    expect(model).toExport(before);
    redo(model);
    expect(model).toExport(after);
  });

  test("undo/redo gauge chart data rebuild the chart runtime", () => {
    createGaugeChart(
      model,
      {
        dataRange: "Sheet1!A2",
      },
      "27"
    );
    let chart = (model.getters.getChartRuntime("27") as GaugeChartRuntime)!.chartJsConfig;
    setCellContent(model, "A2", "99");
    chart = (model.getters.getChartRuntime("27") as GaugeChartRuntime)!.chartJsConfig;
    expect(chart.data!.datasets![0].value).toBe(99);
    setCellContent(model, "A2", "12");
    chart = (model.getters.getChartRuntime("27") as GaugeChartRuntime)!.chartJsConfig;
    expect(chart.data!.datasets![0].value).toBe(12);
    undo(model);
    chart = (model.getters.getChartRuntime("27") as GaugeChartRuntime)!.chartJsConfig;
    expect(chart.data!.datasets![0].value).toBe(99);
    redo(model);
    chart = (model.getters.getChartRuntime("27") as GaugeChartRuntime)!.chartJsConfig;
    expect(chart.data!.datasets![0].value).toBe(12);
  });
});

describe("Chart design configuration", () => {
  let defaultChart: GaugeChartDefinition;
  let model: Model;

  beforeEach(() => {
    model = new Model();
    defaultChart = {
      background: "#ffffff",
      dataRange: "A1",
      title: "My chart",
      type: "gauge",
      sectionRule: deepCopy(defaultSectionRule),
    };
  });

  test("dataRange with a zero value", () => {
    setCellContent(model, "A1", "0");
    createGaugeChart(model, defaultChart, "1");
    const chart = (model.getters.getChartRuntime("1") as GaugeChartRuntime)!.chartJsConfig;
    expect(chart.data!.datasets![0].value).toBe(0);
  });

  test("empty dataRange --> make needle value to the minimum (rangeMin - delta)", () => {
    defaultChart = {
      ...defaultChart,
      sectionRule: {
        ...defaultChart.sectionRule,
        rangeMin: "0",
        rangeMax: "120",
      },
    };
    createGaugeChart(model, defaultChart, "1");
    const chart = (model.getters.getChartRuntime("1") as GaugeChartRuntime)!.chartJsConfig;
    // delta = (rangeMax - rangeMin)/30
    const delta = (120 - 0) / 30;
    expect(chart.data!.datasets![0].value).toBe(0 - delta);
  });

  test("empty dataRange --> don't display label value", () => {
    createGaugeChart(model, defaultChart, "1");
    const chart = (model.getters.getChartRuntime("1") as GaugeChartRuntime)!.chartJsConfig;
    expect(chart.options!.valueLabel!.display).toBe(false);
  });

  test("NaN dataRange --> make needle value to the minimum", () => {
    defaultChart = {
      ...defaultChart,
      sectionRule: {
        ...defaultChart.sectionRule,
        rangeMin: "0",
        rangeMax: "120",
      },
    };
    setCellContent(model, "A1", "bla bla bla");
    createGaugeChart(model, defaultChart, "1");
    const chart = (model.getters.getChartRuntime("1") as GaugeChartRuntime)!.chartJsConfig;
    // delta = (rangeMax - rangeMin)/30
    const delta = (120 - 0) / 30;
    expect(chart.data!.datasets![0].value).toBe(0 - delta);
  });

  test("NaN dataRange -->  don't display label value", () => {
    setCellContent(model, "A1", "bla bla bla");
    createGaugeChart(model, defaultChart, "1");
    const chart = (model.getters.getChartRuntime("1") as GaugeChartRuntime)!.chartJsConfig;
    expect(chart.options!.valueLabel!.display).toBe(false);
  });

  describe("dataRange < rangeMin", () => {
    let model: Model;
    beforeEach(() => {
      model = new Model();
      defaultChart = {
        ...defaultChart,
        sectionRule: {
          ...defaultChart.sectionRule,
          rangeMin: "-50",
          rangeMax: "100",
        },
      };
      setCellContent(model, "A1", "-60");
    });
    test("scale the internal needle value to (rangeMin - delta)", () => {
      createGaugeChart(model, defaultChart, "1");
      const chart = (model.getters.getChartRuntime("1") as GaugeChartRuntime)!.chartJsConfig;
      // delta = (rangeMax - rangeMin)/30
      const delta = (100 - -50) / 30;
      expect(chart.data!.datasets![0].value).toBe(-50 - delta);
    });
    test("displayed value always correspond to dataRange value", () => {
      createGaugeChart(model, defaultChart, "1");
      const chart = (model.getters.getChartRuntime("1") as GaugeChartRuntime)!.chartJsConfig;
      const displayedValue = chart.options!.valueLabel!.formatter!;
      expect(displayedValue()).toBe("-60");
    });
  });

  describe("dataRange > rangeMax", () => {
    beforeEach(() => {
      model = new Model();
      defaultChart = {
        ...defaultChart,
        sectionRule: {
          ...defaultChart.sectionRule,
          rangeMin: "0",
          rangeMax: "150",
        },
      };
      setCellContent(model, "A1", "160");
    });
    lowerColor;
    test("scale the internal needle value to (rangeMax + delta)", () => {
      createGaugeChart(model, defaultChart, "1");
      const chart = (model.getters.getChartRuntime("1") as GaugeChartRuntime)!.chartJsConfig;
      // delta = (rangeMax - rangeMin)/30
      const delta = (150 - 0) / 30;
      expect(chart.data!.datasets![0].value).toBe(150 + delta);
    });
    test("displayed value always correspond to dataRange value", () => {
      createGaugeChart(model, defaultChart, "1");
      const chart = (model.getters.getChartRuntime("1") as GaugeChartRuntime)!.chartJsConfig;
      const displayedValue = chart.options!.valueLabel!.formatter!;
      expect(displayedValue()).toBe("160");
    });
  });

  test("displayed value respect dataRange format value", () => {
    setCellContent(model, "A1", "0.42");
    selectCell(model, "A1");
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
      format: "0.00%",
    });
    createGaugeChart(model, defaultChart, "1");
    const chart = (model.getters.getChartRuntime("1") as GaugeChartRuntime)!.chartJsConfig;
    const displayedValue = chart.options!.valueLabel!.formatter!;
    expect(displayedValue()).toBe("42.00%");
  });

  test("data configuration include inflection point values followed by rangeMax value", () => {
    defaultChart = {
      ...defaultChart,
      sectionRule: {
        ...defaultChart.sectionRule,
        rangeMax: "62",
        lowerInflectionPoint: {
          ...defaultChart.sectionRule.lowerInflectionPoint,
          value: "22",
        },
        upperInflectionPoint: {
          ...defaultChart.sectionRule.upperInflectionPoint,
          value: "42",
        },
      },
    };
    createGaugeChart(model, defaultChart, "1");
    let chart = (model.getters.getChartRuntime("1") as GaugeChartRuntime)!.chartJsConfig;
    expect(chart.data!.datasets![0].data).toStrictEqual([22, 42, 62]);
    expect(chart.data!.datasets![0].backgroundColor).toStrictEqual([
      lowerColor,
      middleColor,
      upperColor,
    ]);
  });

  test("don't take into account inflection point if empty", () => {
    defaultChart = {
      ...defaultChart,
      sectionRule: {
        ...defaultChart.sectionRule,
        rangeMax: "100",
        lowerInflectionPoint: {
          ...defaultChart.sectionRule.lowerInflectionPoint,
          value: "",
        },
        upperInflectionPoint: {
          ...defaultChart.sectionRule.upperInflectionPoint,
          value: "66",
        },
      },
    };
    createGaugeChart(model, defaultChart, "1");
    let chart = (model.getters.getChartRuntime("1") as GaugeChartRuntime)!.chartJsConfig;
    expect(chart.data!.datasets![0].data).toStrictEqual([66, 100]);
    expect(chart.data!.datasets![0].backgroundColor).toStrictEqual([middleColor, upperColor]);

    defaultChart = {
      ...defaultChart,
      sectionRule: {
        ...defaultChart.sectionRule,
        rangeMax: "100",
        lowerInflectionPoint: {
          ...defaultChart.sectionRule.lowerInflectionPoint,
          value: "33",
        },
        upperInflectionPoint: {
          ...defaultChart.sectionRule.upperInflectionPoint,
          value: "",
        },
      },
    };
    createGaugeChart(model, defaultChart, "2");
    chart = (model.getters.getChartRuntime("2") as GaugeChartRuntime)!.chartJsConfig;
    expect(chart.data!.datasets![0].data).toStrictEqual([33, 100]);
    expect(chart.data!.datasets![0].backgroundColor).toStrictEqual([lowerColor, upperColor]);
  });

  test("scale inflection point value between rangeMin and rangeMax", () => {
    defaultChart = {
      ...defaultChart,
      sectionRule: {
        ...defaultChart.sectionRule,
        rangeMin: "100",
        rangeMax: "200",
        lowerInflectionPoint: {
          ...defaultChart.sectionRule.lowerInflectionPoint,
          value: "90",
        },
        upperInflectionPoint: {
          ...defaultChart.sectionRule.upperInflectionPoint,
          value: "200",
        },
      },
    };
    createGaugeChart(model, defaultChart, "1");
    let chart = (model.getters.getChartRuntime("1") as GaugeChartRuntime)!.chartJsConfig;
    expect(chart.data!.datasets![0].data).toStrictEqual([100, 200, 200]);
    expect(chart.data!.datasets![0].backgroundColor).toStrictEqual([
      lowerColor,
      middleColor,
      upperColor,
    ]);
  });
});
