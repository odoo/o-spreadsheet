import { CellErrorType, ChartCreationContext, CommandResult, Model } from "../../../../src";
import { deepCopy, zoneToXc } from "../../../../src/helpers";
import { GaugeChart } from "../../../../src/helpers/figures/charts";
import {
  GaugeChartDefinition,
  GaugeChartRuntime,
  SectionRule,
} from "../../../../src/types/chart/gauge_chart";
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
} from "../../../test_helpers/commands_helpers";

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
    operator: "<=",
  },
  upperInflectionPoint: {
    type: "number",
    value: "66",
    operator: "<=",
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
    operator: "<=",
  },
  upperInflectionPoint: {
    type: "number",
    value: "70",
    operator: "<=",
  },
};

beforeEach(() => {
  model = new Model();
});

describe("datasource tests", function () {
  test("create a gauge chart", () => {
    createGaugeChart(
      model,
      {
        dataRange: "B8",
        title: { text: "Title" },
        sectionRule: randomSectionRule,
      },
      "chartId"
    );
    expect(model.getters.getChartDefinition("chartId") as GaugeChartDefinition).toMatchObject({
      dataRange: "B8",
      type: "gauge",
      title: { text: "Title" },
      sectionRule: randomSectionRule,
    });
    expect(model.getters.getChartRuntime("chartId") as GaugeChartRuntime).toMatchSnapshot();
  });

  test("create empty gauge chart", () => {
    createGaugeChart(model, { dataRange: "A1" }, "chartId");
    expect(model.getters.getChartDefinition("chartId") as GaugeChartDefinition).toMatchObject({
      type: "gauge",
      dataRange: "A1",
      title: { text: "" },
      sectionRule: defaultSectionRule,
    });
    expect(model.getters.getChartRuntime("chartId") as GaugeChartRuntime).toMatchSnapshot();
  });

  test("create gauge from creation context", () => {
    const context: Required<ChartCreationContext> = {
      background: "#123456",
      title: { text: "hello there" },
      range: [{ dataRange: "Sheet1!B1:B4" }],
      auxiliaryRange: "Sheet1!A1:A4",
      legendPosition: "bottom",
      cumulative: true,
      labelsAsText: true,
      dataSetsHaveTitle: true,
      aggregated: true,
      stacked: true,
      firstValueAsSubtotal: true,
      showConnectorLines: false,
      showSubTotals: true,
      axesDesign: {},
      fillArea: true,
      showValues: false,
    };
    const definition = GaugeChart.getDefinitionFromContextCreation(context);
    expect(definition).toEqual({
      type: "gauge",
      background: "#123456",
      title: { text: "hello there" },
      dataRange: "Sheet1!B1:B4",
      sectionRule: expect.any(Object),
    });
  });

  test("ranges in gauge definition change automatically", () => {
    createGaugeChart(model, { dataRange: "Sheet1!B1:B4" }, "chartId");
    addColumns(model, "before", "A", 2);
    const chart = model.getters.getChartDefinition("chartId") as GaugeChartDefinition;
    expect(chart.dataRange).toStrictEqual("Sheet1!D1:D4");
  });

  test("can delete an imported gauge chart", () => {
    createGaugeChart(model, { dataRange: "B7:B8" }, "chartId");
    const exportedData = model.exportData();
    const newModel = new Model(exportedData);
    expect(newModel.getters.getVisibleFigures()).toHaveLength(1);
    expect(newModel.getters.getChartRuntime("chartId") as GaugeChartRuntime).toBeTruthy();
    newModel.dispatch("DELETE_FIGURE", {
      sheetId: model.getters.getActiveSheetId(),
      id: "chartId",
    });
    expect(newModel.getters.getVisibleFigures()).toHaveLength(0);
    expect(() => newModel.getters.getChartRuntime("chartId")).toThrow();
  });

  test("update gauge chart", () => {
    createGaugeChart(model, { dataRange: "B7:B8" }, "chartId");
    updateChart(model, "chartId", {
      dataRange: "A7",
      title: { text: "hello1" },
      sectionRule: randomSectionRule,
    });
    expect(model.getters.getChartDefinition("chartId") as GaugeChartDefinition).toMatchObject({
      dataRange: "A7",
      title: { text: "hello1" },
      sectionRule: randomSectionRule,
    });
  });

  test("Can use formulas as gauge chart values", () => {
    setCellContent(model, "A1", "42");
    setCellContent(model, "A2", "150");

    createGaugeChart(
      model,
      {
        dataRange: "A1",
        sectionRule: {
          rangeMin: "=0",
          rangeMax: "=A2 - 20",
          lowerInflectionPoint: {
            operator: "<=",
            value: "=SUM(10, 12)",
            type: "number",
          },
          upperInflectionPoint: {
            operator: "<=",
            value: "=DIVIDE(100, 2)",
            type: "percentage",
          },
          colors: {
            lowerColor: "#6aa84f",
            middleColor: "#f1c232",
            upperColor: "#cc0000",
          },
        },
      },
      "1"
    );
    const runtime = model.getters.getChartRuntime("1") as GaugeChartRuntime;

    expect(runtime.minValue).toMatchObject({ value: 0, label: "0" });
    expect(runtime.maxValue).toMatchObject({ value: 130, label: "130" });
    expect(runtime.inflectionValues).toMatchObject([
      { value: 22, label: "22", operator: "<=" },
      { value: 65, label: "65", operator: "<=" }, // 50% of 130
    ]);
  });

  test("create gauge chart with invalid ranges", () => {
    const result = createGaugeChart(model, { dataRange: "this is invalid" }, "chartId");
    expect(result).toBeCancelledBecause(CommandResult.InvalidGaugeDataRange);
  });

  describe("create gauge chart with invalid section rule", () => {
    let sectionRule: SectionRule;
    let model: Model;
    beforeEach(() => {
      sectionRule = deepCopy(defaultSectionRule);
      model = new Model();
    });

    test("empty rangeMin", async () => {
      sectionRule = { ...sectionRule, rangeMin: "" };
      const result = createGaugeChart(model, { dataRange: "A1", sectionRule }, "chartId");
      expect(result).toBeCancelledBecause(CommandResult.EmptyGaugeRangeMin);
    });

    test("NaN rangeMin", async () => {
      sectionRule = { ...sectionRule, rangeMin: "I'm not a number" };
      const result = createGaugeChart(model, { dataRange: "A1", sectionRule }, "chartId");
      expect(result).toBeCancelledBecause(CommandResult.GaugeRangeMinNaN);
    });

    test("Invalid rangeMin formula value", () => {
      sectionRule = { ...sectionRule, rangeMin: '=CONCAT("hello", "there")' };
      const result = createGaugeChart(model, { dataRange: "A1", sectionRule }, "1");
      expect(result).toBeSuccessfullyDispatched();
      expect(model.getters.getChartRuntime("1")).toMatchObject({
        minValue: { value: 0, label: "" },
        maxValue: { value: 100, label: "" },
        gaugeValue: { value: 0, label: CellErrorType.GenericError },
        inflectionValues: [],
        colors: [],
      });
    });

    test("empty rangeMax", async () => {
      sectionRule = { ...sectionRule, rangeMax: "" };
      const result = createGaugeChart(model, { dataRange: "A1", sectionRule }, "chartId");
      expect(result).toBeCancelledBecause(CommandResult.EmptyGaugeRangeMax);
    });

    test("NaN rangeMax", async () => {
      sectionRule = { ...sectionRule, rangeMax: "I'm not a number" };
      const result = createGaugeChart(model, { dataRange: "A1", sectionRule }, "chartId");
      expect(result).toBeCancelledBecause(CommandResult.GaugeRangeMaxNaN);
    });

    test("Invalid rangeMin formula value", () => {
      sectionRule = { ...sectionRule, rangeMax: "=)))(((invalid formula)))" };
      const result = createGaugeChart(model, { dataRange: "A1", sectionRule }, "1");
      expect(result).toBeSuccessfullyDispatched();
      expect(model.getters.getChartRuntime("1")).toMatchObject({
        minValue: { value: 0, label: "" },
        maxValue: { value: 100, label: "" },
        gaugeValue: { value: 0, label: CellErrorType.GenericError },
        inflectionValues: [],
        colors: [],
      });
    });

    test("NaN LowerInflectionPoint", async () => {
      sectionRule = {
        ...sectionRule,
        lowerInflectionPoint: { ...sectionRule.lowerInflectionPoint, value: "I'm not a number" },
      };
      const result = createGaugeChart(model, { dataRange: "A1", sectionRule }, "chartId");
      expect(result).toBeCancelledBecause(CommandResult.GaugeLowerInflectionPointNaN);
    });

    test("Invalid formula LowerInflectionPoint", () => {
      sectionRule = {
        ...sectionRule,
        lowerInflectionPoint: { ...sectionRule.lowerInflectionPoint, value: '=TRIM("hello")' },
      };
      const result = createGaugeChart(model, { dataRange: "A1", sectionRule }, "1");
      expect(result).toBeSuccessfullyDispatched();
      const runtime = model.getters.getChartRuntime("1") as GaugeChartRuntime;
      expect(runtime.inflectionValues).toHaveLength(1); // only the upper inflection point is valid and kept
    });

    test("NaN UpperInflectionPoint", async () => {
      sectionRule = {
        ...sectionRule,
        upperInflectionPoint: {
          ...sectionRule.upperInflectionPoint,
          value: "I'm not a number",
        },
      };
      const result = createGaugeChart(model, { dataRange: "A1", sectionRule }, "chartId");
      expect(result).toBeCancelledBecause(CommandResult.GaugeUpperInflectionPointNaN);
    });

    test("Invalid formula UpperInflectionPoint", () => {
      sectionRule = {
        ...sectionRule,
        upperInflectionPoint: {
          ...sectionRule.upperInflectionPoint,
          value: '=CONCAT("hello", " there")',
        },
      };
      const result = createGaugeChart(model, { dataRange: "A1", sectionRule }, "1");
      expect(result).toBeSuccessfullyDispatched();
      const runtime = model.getters.getChartRuntime("1") as GaugeChartRuntime;
      expect(runtime.inflectionValues).toHaveLength(1); // only the lower inflection point is valid and kept
    });
  });

  test("Gauge Chart is deleted on sheet deletion", () => {
    model.dispatch("CREATE_SHEET", { sheetId: "sheet2", position: 1 });
    createGaugeChart(model, { dataRange: "Sheet1!B1:B4" }, "chartId", "sheet2");
    expect(model.getters.getChartRuntime("chartId") as GaugeChartRuntime).not.toBeUndefined();
    model.dispatch("DELETE_SHEET", { sheetId: "sheet2" });
    expect(() => model.getters.getChartRuntime("chartId")).toThrow();
  });

  test("Gauge chart is copied on sheet duplication", () => {
    const firstSheetId = model.getters.getActiveSheetId();
    const secondSheetId = "sheet2";
    createGaugeChart(
      model,
      {
        title: { text: "test" },
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

    expect(duplicatedChart.title.text).toEqual("test");
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

test("create a gauge chart with data from another sheet", () => {
  model = new Model();
  createSheet(model, { sheetId: "42", activate: true });
  createGaugeChart(model, { dataRange: "Sheet1!B1" }, "chartId");
  const chart = model.getters.getChartDefinition("chartId") as GaugeChartDefinition;
  expect(chart.dataRange).toEqual("Sheet1!B1");
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
    createGaugeChart(model, { dataRange: "Sheet1!A2" }, "27");
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
      title: { text: "My chart" },
      type: "gauge",
      sectionRule: deepCopy(defaultSectionRule),
    };
  });

  test("dataRange with a zero value", () => {
    setCellContent(model, "A1", "0");
    createGaugeChart(model, defaultChart, "chartId");
    const gaugeValue = (model.getters.getChartRuntime("chartId") as GaugeChartRuntime).gaugeValue;
    expect(gaugeValue?.value).toBe(0);
  });

  test("empty/NaN dataRange have undefined gauge value", () => {
    createGaugeChart(model, defaultChart, "chartId");
    let gaugeValue = (model.getters.getChartRuntime("chartId") as GaugeChartRuntime).gaugeValue;
    expect(gaugeValue).toBe(undefined);

    setCellContent(model, "A1", "I'm not a number");
    gaugeValue = (model.getters.getChartRuntime("chartId") as GaugeChartRuntime).gaugeValue;
    expect(gaugeValue).toBe(undefined);
  });

  test("empty dataRange --> gauge value is undefined", () => {
    createGaugeChart(model, defaultChart, "chartId");
    const gaugeValue = (model.getters.getChartRuntime("chartId") as GaugeChartRuntime).gaugeValue;
    expect(gaugeValue).toBe(undefined);
  });

  test("NaN dataRange --> gauge value is undefined", () => {
    setCellContent(model, "A1", "bla bla bla");
    createGaugeChart(model, defaultChart, "chartId");
    const gaugeValue = (model.getters.getChartRuntime("chartId") as GaugeChartRuntime).gaugeValue;
    expect(gaugeValue).toBe(undefined);
  });

  test("rangeMin and rangeMax are sorted in the runtime", async () => {
    const sectionRule = { ...defaultChart.sectionRule, rangeMin: "66", rangeMax: "33" };

    createGaugeChart(model, { sectionRule }, "chartId");
    const runtime = model.getters.getChartRuntime("chartId") as GaugeChartRuntime;
    expect(runtime.minValue).toMatchObject({ value: 33 });
    expect(runtime.maxValue).toMatchObject({ value: 66 });
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
    createGaugeChart(model, chart, "chartId");
    const runtime = model.getters.getChartRuntime("chartId") as GaugeChartRuntime;
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
    createGaugeChart(model, chart, "chartId");
    const runtime = model.getters.getChartRuntime("chartId") as GaugeChartRuntime;
    expect(runtime.colors).toEqual(["#6aa84f", "#cc0000"]);
    expect(runtime.inflectionValues).toMatchObject([{ value: 66 }]);
  });

  test("displayed values respect dataRange format", () => {
    setCellContent(model, "A1", "42");
    setFormat(model, "A1", "[$$]0.00");
    createGaugeChart(model, defaultChart, "chartId");
    const chart = model.getters.getChartRuntime("chartId") as GaugeChartRuntime;
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
    createGaugeChart(model, defaultChart, "chartId");
    let chart = model.getters.getChartRuntime("chartId") as GaugeChartRuntime;
    expect(chart.inflectionValues).toEqual([
      { value: 22, label: "22", operator: "<=" },
      { value: 42, label: "42", operator: "<=" },
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
    createGaugeChart(model, defaultChart, "chartId");
    let chart = model.getters.getChartRuntime("chartId") as GaugeChartRuntime;
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
    createGaugeChart(model, defaultChart, "chart2");
    chart = model.getters.getChartRuntime("chart2") as GaugeChartRuntime;
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
    createGaugeChart(model, defaultChart, "chartId");
    let chart = model.getters.getChartRuntime("chartId") as GaugeChartRuntime;
    expect(chart.inflectionValues).toMatchObject([{ value: 100 }, { value: 200 }]);
    expect(chart.colors).toStrictEqual([lowerColor, middleColor, upperColor]);
  });

  test("Can have lesser than or lesser or equal than operators in thresholds", () => {
    defaultChart = {
      ...defaultChart,
      sectionRule: {
        ...defaultChart.sectionRule,
        lowerInflectionPoint: { type: "number", value: "10", operator: "<" },
        upperInflectionPoint: { type: "number", value: "30", operator: "<=" },
      },
    };
    createGaugeChart(model, defaultChart, "chartId");
    let chart = model.getters.getChartRuntime("chartId") as GaugeChartRuntime;
    expect(chart.inflectionValues).toMatchObject([
      { value: 10, operator: "<" },
      { value: 30, operator: "<=" },
    ]);
    expect(chart.colors).toStrictEqual([lowerColor, middleColor, upperColor]);
  });
});
