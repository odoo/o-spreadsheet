import { CommandResult, Model } from "../../../src";
import { deepCopy, toZone } from "../../../src/helpers";
import { GaugeChartUIDefinition, SectionRule } from "../../../src/types/chart";
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
    const sheetId = model.getters.getActiveSheetId();
    createGaugeChart(
      model,
      {
        dataRange: "B8",
        title: "Title",
        sectionRule: randomSectionRule,
      },
      "1"
    );
    expect(model.getters.getGaugeChartDefinitionUI(sheetId, "1")).toMatchObject({
      dataRange: "B8",
      type: "gauge",
      title: "Title",
      sectionRule: randomSectionRule,
      sheetId,
    });
    expect(model.getters.getGaugeChartRuntime("1")).toMatchSnapshot();
  });

  test("create empty gauge chart", () => {
    const sheetId = model.getters.getActiveSheetId();
    createGaugeChart(
      model,
      {
        dataRange: "A1",
      },
      "1"
    );
    expect(model.getters.getGaugeChartDefinitionUI(sheetId, "1")).toMatchObject({
      type: "gauge",
      dataRange: "A1",
      title: "",
      sectionRule: defaultSectionRule,
      sheetId,
    });
    expect(model.getters.getGaugeChartRuntime("1")).toMatchSnapshot();
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
    const chart = model.getters.getGaugeChartDefinition("1")!;
    expect(chart.dataRange!.zone).toStrictEqual(toZone("D1:D4"));
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
    expect(newModel.getters.getGaugeChartRuntime("1")).toBeTruthy();
    newModel.dispatch("DELETE_FIGURE", { sheetId: model.getters.getActiveSheetId(), id: "1" });
    expect(newModel.getters.getVisibleFigures()).toHaveLength(0);
    expect(newModel.getters.getGaugeChartRuntime("1")).toBeUndefined();
  });

  test("update gauge chart", () => {
    const sheetId = model.getters.getActiveSheetId();
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
    expect(model.getters.getGaugeChartDefinitionUI(sheetId, "1")).toMatchObject({
      dataRange: "A7",
      title: "hello1",
      sectionRule: randomSectionRule,
    });
  });

  test("create gauge chart empty data range", () => {
    let result = createGaugeChart(
      model,
      {
        dataRange: "",
      },
      "1"
    );
    expect(result).toBeCancelledBecause(CommandResult.EmptyGaugeDataRange);
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
      sectionRule.rangeMin = "";
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
      sectionRule.rangeMin = "I'm not a number";
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
      sectionRule.rangeMax = "";
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
      sectionRule.rangeMax = "I'm not a number";
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
      sectionRule.rangeMin = "100";
      sectionRule.rangeMax = "0";
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
      sectionRule.lowerInflectionPoint.value = "I'm not a number";
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
      sectionRule.upperInflectionPoint.value = "I'm not a number";
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
    expect(model.getters.getGaugeChartRuntime("1")).not.toBeUndefined();
    model.dispatch("DELETE_SHEET", { sheetId: "2" });
    expect(model.getters.getGaugeChartRuntime("1")).toBeUndefined();
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
    const duplicatedChartDefinition = model.getters.getGaugeChartDefinition(duplicatedFigure.id);
    const expectedDuplicatedChartDefinition = {
      dataRange: model.getters.getRangeFromSheetXC(secondSheetId, "B1:B4"),
      sheetId: secondSheetId,
      title: "test",
    };
    expect(duplicatedFigure).toMatchObject({ ...figure, id: expect.any(String) });
    expect(duplicatedFigure.id).not.toBe(figure?.id);
    expect(duplicatedChartDefinition).toMatchObject(expectedDuplicatedChartDefinition);
    // duplicated chart is not deleted if original sheet is deleted
    deleteSheet(model, firstSheetId);
    expect(model.getters.getSheetIds()).toHaveLength(1);
    expect(model.getters.getFigures(secondSheetId)).toEqual([duplicatedFigure]);
    expect(model.getters.getGaugeChartDefinition(duplicatedFigure.id)).toMatchObject(
      expectedDuplicatedChartDefinition
    );
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
    const chart = model.getters.getGaugeChartDefinitionUI("42", "28")!;
    const chartDefinition = model.getters.getGaugeChartDefinition("28");
    expect(chart.dataRange).toEqual("Sheet1!B1");
    expect(chartDefinition).toMatchObject({
      dataRange: {
        prefixSheet: true,
        sheetId: "Sheet1",
        zone: toZone("B1"),
      },
      sheetId: "42",
    });
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
    let chart = model.getters.getGaugeChartRuntime("27")!;
    setCellContent(model, "A2", "99");
    chart = model.getters.getGaugeChartRuntime("27")!;
    expect(chart.data!.datasets![0].value).toBe(99);
    setCellContent(model, "A2", "12");
    chart = model.getters.getGaugeChartRuntime("27")!;
    expect(chart.data!.datasets![0].value).toBe(12);
    undo(model);
    chart = model.getters.getGaugeChartRuntime("27")!;
    expect(chart.data!.datasets![0].value).toBe(99);
    redo(model);
    chart = model.getters.getGaugeChartRuntime("27")!;
    expect(chart.data!.datasets![0].value).toBe(12);
  });
});

describe("Chart design configuration", () => {
  let defaultChart: GaugeChartUIDefinition;
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
    const chart = model.getters.getGaugeChartRuntime("1")!;
    expect(chart.data!.datasets![0].value).toBe(0);
  });

  test("empty dataRange --> make needle value to the minimum (rangeMin - delta)", () => {
    defaultChart.sectionRule.rangeMin = "0";
    defaultChart.sectionRule.rangeMax = "120";
    createGaugeChart(model, defaultChart, "1");
    const chart = model.getters.getGaugeChartRuntime("1")!;
    // delta = (rangeMax - rangeMin)/30
    const delta = (120 - 0) / 30;
    expect(chart.data!.datasets![0].value).toBe(0 - delta);
  });

  test("empty dataRange --> don't display label value", () => {
    createGaugeChart(model, defaultChart, "1");
    const chart = model.getters.getGaugeChartRuntime("1")!;
    expect(chart.options!.valueLabel!.display).toBe(false);
  });

  test("NaN dataRange --> make needle value to the minimum", () => {
    defaultChart.sectionRule.rangeMin = "0";
    defaultChart.sectionRule.rangeMax = "120";
    setCellContent(model, "A1", "bla bla bla");
    createGaugeChart(model, defaultChart, "1");
    const chart = model.getters.getGaugeChartRuntime("1")!;
    // delta = (rangeMax - rangeMin)/30
    const delta = (120 - 0) / 30;
    expect(chart.data!.datasets![0].value).toBe(0 - delta);
  });

  test("NaN dataRange -->  don't display label value", () => {
    setCellContent(model, "A1", "bla bla bla");
    createGaugeChart(model, defaultChart, "1");
    const chart = model.getters.getGaugeChartRuntime("1")!;
    expect(chart.options!.valueLabel!.display).toBe(false);
  });

  describe("dataRange < rangeMin", () => {
    let model: Model;
    beforeEach(() => {
      model = new Model();
      defaultChart.sectionRule.rangeMin = "-50";
      defaultChart.sectionRule.rangeMax = "100";
      setCellContent(model, "A1", "-60");
    });
    test("scale the internal needle value to (rangeMin - delta)", () => {
      createGaugeChart(model, defaultChart, "1");
      const chart = model.getters.getGaugeChartRuntime("1")!;
      // delta = (rangeMax - rangeMin)/30
      const delta = (100 - -50) / 30;
      expect(chart.data!.datasets![0].value).toBe(-50 - delta);
    });
    test("displayed value always correspond to dataRange value", () => {
      createGaugeChart(model, defaultChart, "1");
      const chart = model.getters.getGaugeChartRuntime("1")!;
      const displayedValue = chart.options!.valueLabel!.formatter!;
      expect(displayedValue()).toBe("-60");
    });
  });

  describe("dataRange > rangeMax", () => {
    beforeEach(() => {
      model = new Model();
      defaultChart.sectionRule.rangeMin = "0";
      defaultChart.sectionRule.rangeMax = "150";
      setCellContent(model, "A1", "160");
    });
    lowerColor;
    test("scale the internal needle value to (rangeMax + delta)", () => {
      createGaugeChart(model, defaultChart, "1");
      const chart = model.getters.getGaugeChartRuntime("1")!;
      // delta = (rangeMax - rangeMin)/30
      const delta = (150 - 0) / 30;
      expect(chart.data!.datasets![0].value).toBe(150 + delta);
    });
    test("displayed value always correspond to dataRange value", () => {
      createGaugeChart(model, defaultChart, "1");
      const chart = model.getters.getGaugeChartRuntime("1")!;
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
    const chart = model.getters.getGaugeChartRuntime("1")!;
    const displayedValue = chart.options!.valueLabel!.formatter!;
    expect(displayedValue()).toBe("42.00%");
  });

  test("data configuration include inflection point values followed by rangeMax value", () => {
    defaultChart.sectionRule.lowerInflectionPoint.value = "22";
    defaultChart.sectionRule.upperInflectionPoint.value = "42";
    defaultChart.sectionRule.rangeMax = "62";
    createGaugeChart(model, defaultChart, "1");
    let chart = model.getters.getGaugeChartRuntime("1")!;
    expect(chart.data!.datasets![0].data).toStrictEqual([22, 42, 62]);
    expect(chart.data!.datasets![0].backgroundColor).toStrictEqual([
      lowerColor,
      middleColor,
      upperColor,
    ]);
  });

  test("don't take into account inflection point if empty", () => {
    defaultChart.sectionRule.rangeMax = "100";
    defaultChart.sectionRule.lowerInflectionPoint.value = "";
    defaultChart.sectionRule.upperInflectionPoint.value = "66";
    createGaugeChart(model, defaultChart, "1");
    let chart = model.getters.getGaugeChartRuntime("1")!;
    expect(chart.data!.datasets![0].data).toStrictEqual([66, 100]);
    expect(chart.data!.datasets![0].backgroundColor).toStrictEqual([middleColor, upperColor]);

    defaultChart.sectionRule.lowerInflectionPoint.value = "33";
    defaultChart.sectionRule.upperInflectionPoint.value = "";
    createGaugeChart(model, defaultChart, "2");
    chart = model.getters.getGaugeChartRuntime("2")!;
    expect(chart.data!.datasets![0].data).toStrictEqual([33, 100]);
    expect(chart.data!.datasets![0].backgroundColor).toStrictEqual([lowerColor, upperColor]);
  });

  test("scale inflection point value between rangeMin and rangeMax", () => {
    defaultChart.sectionRule.rangeMin = "100";
    defaultChart.sectionRule.rangeMax = "200";
    defaultChart.sectionRule.lowerInflectionPoint.value = "90";
    defaultChart.sectionRule.upperInflectionPoint.value = "210";
    createGaugeChart(model, defaultChart, "1");
    let chart = model.getters.getGaugeChartRuntime("1")!;
    expect(chart.data!.datasets![0].data).toStrictEqual([100, 200, 200]);
    expect(chart.data!.datasets![0].backgroundColor).toStrictEqual([
      lowerColor,
      middleColor,
      upperColor,
    ]);
  });
});
