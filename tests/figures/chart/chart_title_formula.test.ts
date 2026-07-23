import { Model } from "../../../src";
import { getChartTitleFormulaOwnerId, SpreadsheetChart } from "../../../src/helpers/figures/chart";
import { GenericFormulaEvaluator } from "../../../src/plugins/ui_core_views/formula_manager/generic_formula_evaluator";
import { BarChartRuntime } from "../../../src/types/chart/bar_chart";
import {
  createChart,
  deleteColumns,
  deleteFigure,
  setCellContent,
  updateChart,
} from "../../test_helpers/commands_helpers";

function getChartTitleText(model: Model, chartId: string): string | undefined {
  const runtime = model.getters.getChartRuntime(chartId) as BarChartRuntime;
  return runtime.chartJsConfig.options?.plugins?.title?.text as string | undefined;
}

describe("chart title formula", () => {
  test("a formula title reflects the referenced cell's current value", () => {
    const model = new Model();
    setCellContent(model, "A1", "Sales report");
    createChart(model, { type: "bar", title: { text: "=A1" } }, "chartId");
    expect(getChartTitleText(model, "chartId")).toBe("Sales report");
  });

  test("the title updates when the referenced cell changes", () => {
    const model = new Model();
    setCellContent(model, "A1", "Sales report");
    createChart(model, { type: "bar", title: { text: "=A1" } }, "chartId");
    expect(getChartTitleText(model, "chartId")).toBe("Sales report");

    setCellContent(model, "A1", "Updated report");
    expect(getChartTitleText(model, "chartId")).toBe("Updated report");
  });

  test("the title is not recomputed when an unrelated cell changes", () => {
    const model = new Model();
    setCellContent(model, "A1", "Sales report");
    createChart(model, { type: "bar", title: { text: "=A1" } }, "chartId");

    const evaluateSpy = jest.spyOn(GenericFormulaEvaluator.prototype, "evaluate");
    expect(getChartTitleText(model, "chartId")).toBe("Sales report");
    expect(evaluateSpy).toHaveBeenCalledTimes(1);

    setCellContent(model, "Z1", "unrelated");
    expect(getChartTitleText(model, "chartId")).toBe("Sales report");
    expect(evaluateSpy).toHaveBeenCalledTimes(1);

    evaluateSpy.mockRestore();
  });

  test("the title recomputes through a multi-hop dependency chain", () => {
    const model = new Model();
    setCellContent(model, "A1", "1");
    setCellContent(model, "B1", "=A1+1");
    setCellContent(model, "C1", "=B1+1");
    createChart(model, { type: "bar", title: { text: "=C1" } }, "chartId");
    expect(getChartTitleText(model, "chartId")).toBe("3");

    setCellContent(model, "A1", "10");
    expect(getChartTitleText(model, "chartId")).toBe("12");
  });

  test("the title formula's reference is adapted when a column is removed (regression)", () => {
    const model = new Model();
    setCellContent(model, "B2", "Sales report");
    createChart(model, { type: "bar", title: { text: "=B2" } }, "chartId");
    expect(getChartTitleText(model, "chartId")).toBe("Sales report");

    deleteColumns(model, ["A"]);
    // B2's content shifted to A2; the title formula must follow it.
    expect(model.getters.getChartDefinition("chartId").title.text).toBe("=A2");
    expect(getChartTitleText(model, "chartId")).toBe("Sales report");
  });

  test("the title formula owner id is computed once per chart definition, not on every runtime rebuild", () => {
    const computeSpy = jest.spyOn(SpreadsheetChart.prototype as any, "computeTitleFormulaOwnerId");

    const model = new Model();
    setCellContent(model, "A1", "Sales report");
    createChart(model, { type: "bar", title: { text: "=A1" } }, "chartId");
    getChartTitleText(model, "chartId");
    expect(computeSpy).toHaveBeenCalledTimes(1);

    // Unrelated cell edits force EvaluationChartPlugin to rebuild the chart
    // runtime from scratch (its own coarse invalidation), but the
    // underlying SpreadsheetChart instance is unchanged - the memoized id
    // must be reused rather than recomputed.
    setCellContent(model, "Z1", "unrelated");
    getChartTitleText(model, "chartId");
    setCellContent(model, "Z2", "unrelated 2");
    getChartTitleText(model, "chartId");
    expect(computeSpy).toHaveBeenCalledTimes(1);

    // An actual chart definition change reconstructs the SpreadsheetChart
    // instance, so the id is recomputed once more - correctly, not a leak.
    updateChart(model, "chartId", { background: "#ff0000" });
    getChartTitleText(model, "chartId");
    expect(computeSpy).toHaveBeenCalledTimes(2);

    computeSpy.mockRestore();
  });

  test("a literal title is unaffected (regression)", () => {
    const model = new Model();
    createChart(model, { type: "bar", title: { text: "Literal title" } }, "chartId");
    expect(getChartTitleText(model, "chartId")).toBe("Literal title");

    const id = getChartTitleFormulaOwnerId("chartId");
    expect(model.getters.getFormulaOwnerRecords().some((r) => r.id === id)).toBe(false);
  });

  test("getFormulaOwnerRecords tracks chart title owners as charts are created/updated/deleted", () => {
    const model = new Model();
    setCellContent(model, "A1", "Sales report");
    createChart(model, { type: "bar", title: { text: "=A1" } }, "chartId");
    const id = getChartTitleFormulaOwnerId("chartId");
    expect(model.getters.getFormulaOwnerRecords().some((r) => r.id === id)).toBe(true);

    updateChart(model, "chartId", { title: { text: "no longer a formula" } });
    expect(model.getters.getFormulaOwnerRecords().some((r) => r.id === id)).toBe(false);

    updateChart(model, "chartId", { title: { text: "=A1" } });
    expect(model.getters.getFormulaOwnerRecords().some((r) => r.id === id)).toBe(true);

    deleteFigure(model, model.getters.getFigureIdFromChartId("chartId"));
    expect(model.getters.getFormulaOwnerRecords().some((r) => r.id === id)).toBe(false);
  });
});
