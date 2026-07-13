import { Model } from "../../../src";
import { SpreadsheetChart } from "../../../src/helpers/figures/chart";
import { toChartDataSource } from "../../test_helpers/chart_helpers";
import {
  createBubbleChart,
  createChart,
  createGaugeChart,
  createGeoChart,
  createScorecardChart,
  setCellContent,
} from "../../test_helpers/commands_helpers";
import { mockGeoJsonService } from "../../test_helpers/helpers";

function spyOnGetRuntime() {
  return jest.spyOn(SpreadsheetChart.prototype, "getRuntime");
}

function createGaugeWithFormulaInSectionRule(
  model: Model,
  sectionRuleOverride: Record<string, unknown>,
  chartId: string
) {
  createGaugeChart(
    model,
    {
      sectionRule: {
        rangeMin: "0",
        rangeMax: "100",
        colors: {
          lowerColor: "#6aa84f",
          middleColor: "#f1c232",
          upperColor: "#cc0000",
        },
        lowerInflectionPoint: { type: "number", value: "33", operator: "<=" },
        upperInflectionPoint: { type: "number", value: "66", operator: "<=" },
        ...sectionRuleOverride,
      },
    },
    chartId
  );
}

describe("Chart runtime cache invalidation", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("updating a cell that a chart range formula depends on invalidates the chart runtime", () => {
    const model = new Model();
    setCellContent(model, "A1", "1");
    setCellContent(model, "B1", "=A1*2"); // B1 is in chart range and depends on A1
    const chartId = "chart1";
    createChart(
      model,
      { type: "bar", ...toChartDataSource({ dataSets: [{ dataRange: "B1" }] }) },
      chartId
    );

    model.getters.getChartRuntime(chartId);
    const spy = spyOnGetRuntime();
    setCellContent(model, "A1", "99"); // A1 is outside chart range but B1=A1*2
    model.getters.getChartRuntime(chartId);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  test("updating a cell whose dependents are outside chart range does NOT invalidate the chart runtime", () => {
    const model = new Model();
    setCellContent(model, "A1", "1");
    setCellContent(model, "B1", "2");
    setCellContent(model, "C1", "=B1*2"); // C1 depends on B1, but chart uses only A1
    const chartId = "chart1";
    createChart(
      model,
      { type: "bar", ...toChartDataSource({ dataSets: [{ dataRange: "A1" }] }) },
      chartId
    );

    model.getters.getChartRuntime(chartId);
    const spy = spyOnGetRuntime();
    setCellContent(model, "B1", "99"); // B1 is outside chart range, C1 also outside
    model.getters.getChartRuntime(chartId);

    expect(spy).not.toHaveBeenCalled();
  });

  test("updating a cell only invalidates the affected chart, not all charts", () => {
    const model = new Model();
    setCellContent(model, "A1", "1");
    setCellContent(model, "B1", "2");

    createChart(
      model,
      { type: "bar", ...toChartDataSource({ dataSets: [{ dataRange: "A1" }] }) },
      "chartA"
    );
    createChart(
      model,
      { type: "bar", ...toChartDataSource({ dataSets: [{ dataRange: "B1" }] }) },
      "chartB"
    );

    model.getters.getChartRuntime("chartA");
    model.getters.getChartRuntime("chartB");
    const spy = spyOnGetRuntime();
    setCellContent(model, "A1", "99"); // only affects chartA
    model.getters.getChartRuntime("chartA");
    model.getters.getChartRuntime("chartB");

    expect(spy).toHaveBeenCalledTimes(1); // only chartA's getRuntime was called
  });

  describe("dataSource-based charts", () => {
    const dataSourceChartTypes = [
      "bar",
      "line",
      "pie",
      "scatter",
      "combo",
      "radar",
      "waterfall",
      "funnel",
      "pyramid",
      "sunburst",
      "treemap",
      "calendar",
    ] as const;

    test.each(dataSourceChartTypes)(
      "%s: updating a cell inside the data range invalidates the runtime",
      (type) => {
        const model = new Model();
        setCellContent(model, "A1", "1");
        const chartId = "chartId";
        createChart(
          model,
          { type, ...toChartDataSource({ dataSets: [{ dataRange: "A1" }] }) },
          chartId
        );

        model.getters.getChartRuntime(chartId);
        const spy = spyOnGetRuntime();
        setCellContent(model, "A1", "42");
        model.getters.getChartRuntime(chartId);

        expect(spy).toHaveBeenCalledTimes(1);
      }
    );

    test.each(dataSourceChartTypes)(
      "%s: updating a cell outside the data range does NOT invalidate the runtime",
      (type) => {
        const model = new Model();
        setCellContent(model, "A1", "1");
        const chartId = "chartId";
        createChart(
          model,
          { type, ...toChartDataSource({ dataSets: [{ dataRange: "A1" }] }) },
          chartId
        );

        model.getters.getChartRuntime(chartId);
        const spy = spyOnGetRuntime();
        setCellContent(model, "Z99", "irrelevant");
        model.getters.getChartRuntime(chartId);

        expect(spy).not.toHaveBeenCalled();
      }
    );

    test("updating a cell inside the label range invalidates the runtime", () => {
      const model = new Model();
      setCellContent(model, "A1", "label");
      setCellContent(model, "B1", "1");
      const chartId = "chartId";
      createChart(
        model,
        {
          type: "bar",
          ...toChartDataSource({ dataSets: [{ dataRange: "B1" }], labelRange: "A1" }),
        },
        chartId
      );

      model.getters.getChartRuntime(chartId);
      const spy = spyOnGetRuntime();
      setCellContent(model, "A1", "new label");
      model.getters.getChartRuntime(chartId);

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe("gauge chart", () => {
    test("updating a cell inside the data range invalidates the runtime", () => {
      const model = new Model();
      setCellContent(model, "A1", "42");
      const chartId = "chartId";
      createGaugeChart(model, { dataRange: "A1" }, chartId);

      model.getters.getChartRuntime(chartId);
      const spy = spyOnGetRuntime();
      setCellContent(model, "A1", "100");
      model.getters.getChartRuntime(chartId);

      expect(spy).toHaveBeenCalledTimes(1);
    });

    test("updating a cell outside the data range does NOT invalidate the runtime", () => {
      const model = new Model();
      setCellContent(model, "A1", "42");
      const chartId = "chartId";
      createGaugeChart(model, { dataRange: "A1" }, chartId);

      model.getters.getChartRuntime(chartId);
      const spy = spyOnGetRuntime();
      setCellContent(model, "Z99", "irrelevant");
      model.getters.getChartRuntime(chartId);

      expect(spy).not.toHaveBeenCalled();
    });

    test.each(["rangeMin", "rangeMax"])(
      "updating a cell referenced in sectionRule.%s invalidates the runtime",
      (key) => {
        const model = new Model();
        setCellContent(model, "B1", "0");
        const chartId = "chartId";
        createGaugeWithFormulaInSectionRule(model, { [key]: "=B1" }, chartId);
        model.getters.getChartRuntime(chartId);
        const spy = spyOnGetRuntime();
        setCellContent(model, "B1", "50");
        model.getters.getChartRuntime(chartId);

        expect(spy).toHaveBeenCalledTimes(1);
      }
    );

    test.each(["lowerInflectionPoint", "upperInflectionPoint"])(
      "updating a cell referenced in sectionRule.%s.value invalidates the runtime",
      (key) => {
        const model = new Model();
        setCellContent(model, "B1", "25");
        const chartId = "chartId";
        createGaugeWithFormulaInSectionRule(
          model,
          { [key]: { type: "number", value: "=B1", operator: "<=" } },
          chartId
        );

        model.getters.getChartRuntime(chartId);
        const spy = spyOnGetRuntime();
        setCellContent(model, "B1", "40");
        model.getters.getChartRuntime(chartId);

        expect(spy).toHaveBeenCalledTimes(1);
      }
    );
  });

  describe("scorecard chart", () => {
    test("updating a cell inside keyValue range invalidates the runtime", () => {
      const model = new Model();
      setCellContent(model, "A1", "42");
      const chartId = "chartId";
      createScorecardChart(model, { keyValue: "A1" }, chartId);

      model.getters.getChartRuntime(chartId);
      const spy = spyOnGetRuntime();
      setCellContent(model, "A1", "100");
      model.getters.getChartRuntime(chartId);

      expect(spy).toHaveBeenCalledTimes(1);
    });

    test("updating a cell inside baseline range invalidates the runtime", () => {
      const model = new Model();
      setCellContent(model, "A1", "42");
      setCellContent(model, "B1", "10");
      const chartId = "chartId";
      createScorecardChart(model, { keyValue: "A1", baseline: "B1" }, chartId);

      model.getters.getChartRuntime(chartId);
      const spy = spyOnGetRuntime();
      setCellContent(model, "B1", "20");
      model.getters.getChartRuntime(chartId);

      expect(spy).toHaveBeenCalledTimes(1);
    });

    test("updating a cell outside scorecard ranges does NOT invalidate the runtime", () => {
      const model = new Model();
      setCellContent(model, "A1", "42");
      setCellContent(model, "B1", "10");
      const chartId = "chartId";
      createScorecardChart(model, { keyValue: "A1", baseline: "B1" }, chartId);

      model.getters.getChartRuntime(chartId);
      const spy = spyOnGetRuntime();
      setCellContent(model, "Z99", "irrelevant");
      model.getters.getChartRuntime(chartId);

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("bubble chart", () => {
    test("updating a cell inside a yRange invalidates the runtime", () => {
      const model = new Model();
      setCellContent(model, "A1", "1");
      const chartId = "chartId";
      createBubbleChart(model, { yRanges: ["A1"] }, chartId);

      model.getters.getChartRuntime(chartId);
      const spy = spyOnGetRuntime();
      setCellContent(model, "A1", "42");
      model.getters.getChartRuntime(chartId);

      expect(spy).toHaveBeenCalledTimes(1);
    });

    test.each(["xRange", "labelRange", "sizeRange"])(
      "updating a cell inside %s invalidates the runtime",
      (key) => {
        const model = new Model();
        setCellContent(model, "A1", "1");
        setCellContent(model, "B1", "2");
        const chartId = "chartId";
        createBubbleChart(model, { yRanges: ["A1"], [key]: "B1" }, chartId);

        model.getters.getChartRuntime(chartId);
        const spy = spyOnGetRuntime();
        setCellContent(model, "B1", "99");
        model.getters.getChartRuntime(chartId);

        expect(spy).toHaveBeenCalledTimes(1);
      }
    );

    test("updating a cell outside all bubble ranges does NOT invalidate the runtime", () => {
      const model = new Model();
      setCellContent(model, "A1", "1");
      setCellContent(model, "B1", "2");
      setCellContent(model, "C1", "label");
      setCellContent(model, "D1", "5");
      const chartId = "chartId";
      createBubbleChart(
        model,
        { yRanges: ["A1"], xRange: "B1", labelRange: "C1", sizeRange: "D1" },
        chartId
      );

      model.getters.getChartRuntime(chartId);
      const spy = spyOnGetRuntime();
      setCellContent(model, "Z99", "irrelevant");
      model.getters.getChartRuntime(chartId);

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("geo chart", () => {
    test("updating a cell inside the data range invalidates the runtime", () => {
      const model = new Model({}, { external: { geoJsonService: mockGeoJsonService } });
      setCellContent(model, "A1", "France");
      const chartId = "chartId";
      createGeoChart(
        model,
        {
          dataSource: {
            type: "range",
            dataSets: [{ dataRange: "A1", dataSetId: "0" }],
            dataSetsHaveTitle: false,
          },
        },
        chartId
      );

      model.getters.getChartRuntime(chartId);
      const spy = spyOnGetRuntime();
      setCellContent(model, "A1", "Germany");
      model.getters.getChartRuntime(chartId);

      expect(spy).toHaveBeenCalledTimes(1);
    });

    test("updating a cell outside the data range does NOT invalidate the runtime", () => {
      const model = new Model({}, { external: { geoJsonService: mockGeoJsonService } });
      setCellContent(model, "A1", "France");
      const chartId = "chartId";
      createGeoChart(
        model,
        {
          dataSource: {
            type: "range",
            dataSets: [{ dataRange: "A1", dataSetId: "0" }],
            dataSetsHaveTitle: false,
          },
        },
        chartId
      );

      model.getters.getChartRuntime(chartId);
      const spy = spyOnGetRuntime();
      setCellContent(model, "Z99", "irrelevant");
      model.getters.getChartRuntime(chartId);

      expect(spy).not.toHaveBeenCalled();
    });
  });
});
