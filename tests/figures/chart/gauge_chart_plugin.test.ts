import { ChartCreationContext, CommandResult, Model } from "../../../src";
import { deepCopy, zoneToXc } from "../../../src/helpers";
import {
  GaugeChart,
  getChartDefinitionFromContextCreation,
} from "../../../src/helpers/figures/charts";
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
  setCellContent,
  setFormat,
  undo,
  updateChart,
} from "../../test_helpers/commands_helpers";

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

  test("create gauge from creation context", () => {
    const context: Required<ChartCreationContext> = {
      background: "#123456",
      title: "hello there",
      range: ["Sheet1!B1:B4"],
      auxiliaryRange: "Sheet1!A1:A4",
      legendPosition: "bottom",
      verticalAxisPosition: "right",
      cumulative: true,
      labelsAsText: true,
      dataSetsHaveTitle: true,
      aggregated: true,
      stacked: true,
      firstValueAsSubtotal: true,
      showConnectorLines: false,
      showSubTotals: true,
    };
    const definition = getChartDefinitionFromContextCreation(context, "gauge");
    expect(definition).toEqual({
      type: "gauge",
      background: "#123456",
      title: "hello there",
      dataRange: "Sheet1!B1:B4",
      sectionRule: expect.any(Object),
    });
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
    const figure = model.getters.getFigures(firstSheetId)[0];
    model.dispatch("DUPLICATE_SHEET", {
      sheetIdTo: secondSheetId,
      sheetId: firstSheetId,
    });

    expect(model.getters.getFigures(secondSheetId)).toHaveLength(1);
    const duplicatedFigure = model.getters.getFigures(secondSheetId)[0];
    const duplicatedChart = model.getters.getChart(duplicatedFigure.id) as GaugeChart;

    expect(duplicatedChart.title).toEqual("test");
    expect(zoneToXc(duplicatedChart.dataRange!.zone)).toEqual("B1:B4");
    expect(duplicatedChart.dataRange?.sheetId).toEqual(secondSheetId);

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
    setCellContent(model, "A2", "99");
    let gaugeValue = (model.getters.getChartRuntime("27") as GaugeChartRuntime).gaugeValue;
    expect(gaugeValue?.value).toBe(99);
    setCellContent(model, "A2", "12");
    gaugeValue = (model.getters.getChartRuntime("27") as GaugeChartRuntime).gaugeValue;
    expect(gaugeValue?.value).toBe(12);
    undo(model);
    gaugeValue = (model.getters.getChartRuntime("27") as GaugeChartRuntime).gaugeValue;
    expect(gaugeValue?.value).toBe(99);
    redo(model);
    gaugeValue = (model.getters.getChartRuntime("27") as GaugeChartRuntime).gaugeValue;
    expect(gaugeValue?.value).toBe(12);
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
    const gaugeValue = (model.getters.getChartRuntime("1") as GaugeChartRuntime).gaugeValue;
    expect(gaugeValue?.value).toBe(0);
  });

  test("empty/NaN dataRange have undefined gauge value", () => {
    createGaugeChart(model, defaultChart, "1");
    let gaugeValue = (model.getters.getChartRuntime("1") as GaugeChartRuntime).gaugeValue;
    expect(gaugeValue).toBe(undefined);

    setCellContent(model, "A1", "I'm not a number");
    gaugeValue = (model.getters.getChartRuntime("1") as GaugeChartRuntime).gaugeValue;
    expect(gaugeValue).toBe(undefined);
  });

  test("empty dataRange --> gauge value is undefined", () => {
    createGaugeChart(model, defaultChart, "1");
    const gaugeValue = (model.getters.getChartRuntime("1") as GaugeChartRuntime).gaugeValue;
    expect(gaugeValue).toBe(undefined);
  });

  test("NaN dataRange --> gauge value is undefined", () => {
    setCellContent(model, "A1", "bla bla bla");
    createGaugeChart(model, defaultChart, "1");
    const gaugeValue = (model.getters.getChartRuntime("1") as GaugeChartRuntime).gaugeValue;
    expect(gaugeValue).toBe(undefined);
  });

  test("Inflection point are sorted in the runtime", () => {
    const chart = {
      ...defaultChart,
      sectionRule: {
        ...defaultChart.sectionRule,
        lowerInflectionPoint: {
          ...defaultChart.sectionRule.lowerInflectionPoint,
          value: "66",
        },
        upperInflectionPoint: {
          ...defaultChart.sectionRule.upperInflectionPoint,
          value: "33",
        },
        colors: {
          lowerColor: "#f1c232",
          middleColor: "#cc0000",
          upperColor: "#6aa84f",
        },
      },
    };
    createGaugeChart(model, chart, "1");
    const runtime = model.getters.getChartRuntime("1") as GaugeChartRuntime;
    expect(runtime.colors).toEqual(["#cc0000", "#f1c232", "#6aa84f"]);
    expect(runtime.inflectionValues).toMatchObject([{ value: 33 }, { value: 66 }]);
  });

  test("Duplicated inflection points are filtered in the runtime", () => {
    const chart = {
      ...defaultChart,
      sectionRule: {
        ...defaultChart.sectionRule,
        lowerInflectionPoint: {
          ...defaultChart.sectionRule.lowerInflectionPoint,
          value: "66",
        },
        upperInflectionPoint: {
          ...defaultChart.sectionRule.upperInflectionPoint,
          value: "66",
        },
        colors: {
          lowerColor: "#6aa84f",
          middleColor: "#f1c232",
          upperColor: "#cc0000",
        },
      },
    };
    createGaugeChart(model, chart, "1");
    const runtime = model.getters.getChartRuntime("1") as GaugeChartRuntime;
    expect(runtime.colors).toEqual(["#6aa84f", "#cc0000"]);
    expect(runtime.inflectionValues).toMatchObject([{ value: 66 }]);
  });

  test("displayed values respect dataRange format", () => {
    setCellContent(model, "A1", "42");
    setFormat(model, "A1", "[$$]0.00");
    createGaugeChart(model, defaultChart, "1");
    const chart = model.getters.getChartRuntime("1") as GaugeChartRuntime;
    expect(chart.gaugeValue?.label).toBe("$42.00");
    expect(chart.inflectionValues[0].label).toBe("$33.00");
    expect(chart.inflectionValues[1].label).toBe("$66.00");
    expect(chart.minValue.label).toBe("$0.00");
    expect(chart.maxValue.label).toBe("$100.00");
  });

  test("data configuration include inflection point values", () => {
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
    let chart = model.getters.getChartRuntime("1") as GaugeChartRuntime;
    expect(chart.inflectionValues).toEqual([
      { value: 22, label: "22" },
      { value: 42, label: "42" },
    ]);
    expect(chart.colors).toStrictEqual([lowerColor, middleColor, upperColor]);
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
    let chart = model.getters.getChartRuntime("1") as GaugeChartRuntime;
    expect(chart.inflectionValues).toMatchObject([{ value: 66 }]);
    expect(chart.colors).toStrictEqual([middleColor, upperColor]);

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
    chart = model.getters.getChartRuntime("2") as GaugeChartRuntime;
    expect(chart.inflectionValues).toMatchObject([{ value: 33 }]);
    expect(chart.colors).toStrictEqual([lowerColor, upperColor]);
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
    let chart = model.getters.getChartRuntime("1") as GaugeChartRuntime;
    expect(chart.inflectionValues).toMatchObject([{ value: 100 }, { value: 200 }]);
    expect(chart.colors).toStrictEqual([lowerColor, middleColor, upperColor]);
  });
});
