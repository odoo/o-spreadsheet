import { Model } from "../../../src";
import { UID } from "../../../src/types";
import {
  createChart,
  createGaugeChart,
  createScorecardChart,
  setCellContent,
  undo,
} from "../../test_helpers/commands_helpers";

/**
 * Tests for selective chart runtime invalidation.
 *
 * Chart runtimes should only be re-computed when a cell within the chart's
 * data ranges (or a cell that transitively feeds into them via formulas)
 * is re-evaluated. Editing a cell that has no relation to a chart should
 * not invalidate its cached runtime.
 */
describe("Chart runtime selective invalidation", () => {
  let model: Model;
  let sheetId: UID;
  const chartId = "chartId";

  beforeEach(() => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
  });

  function getRuntime() {
    return model.getters.getChartRuntime(chartId);
  }

  describe("Bar/line/pie charts (dataSets + labelRange)", () => {
    beforeEach(() => {
      createChart(
        model,
        { type: "bar", dataSets: [{ dataRange: "B1:B5" }], labelRange: "A1:A5" },
        chartId
      );
    });

    test("runtime is not re-created when a cell outside the chart ranges changes", () => {
      const runtime1 = getRuntime();
      setCellContent(model, "C1", "999");
      const runtime2 = getRuntime();
      expect(runtime2).toBe(runtime1);
    });

    test("runtime is re-created when a cell inside the data range changes", () => {
      const runtime1 = getRuntime();
      setCellContent(model, "B2", "42");
      const runtime2 = getRuntime();
      expect(runtime2).not.toBe(runtime1);
    });

    test("runtime is re-created when a cell inside the label range changes", () => {
      const runtime1 = getRuntime();
      setCellContent(model, "A3", "new label");
      const runtime2 = getRuntime();
      expect(runtime2).not.toBe(runtime1);
    });

    test("runtime is re-created via transitive formula dependency", () => {
      // B10 feeds into B2 (which is in the chart range)
      setCellContent(model, "B2", "=B10");
      const runtime1 = getRuntime();
      // Modifying B10 should invalidate the chart (B10 → B2 → chart)
      setCellContent(model, "B10", "99");
      const runtime2 = getRuntime();
      expect(runtime2).not.toBe(runtime1);
    });

    test("runtime is not re-created when a formula outside the chart changes", () => {
      // C2 is not in any chart range
      setCellContent(model, "C2", "=D5+1");
      const runtime1 = getRuntime();
      setCellContent(model, "D5", "10");
      const runtime2 = getRuntime();
      expect(runtime2).toBe(runtime1);
    });

    test("runtime is re-created on UNDO", () => {
      setCellContent(model, "B2", "42");
      const runtimeAfterEdit = getRuntime();
      undo(model);
      const runtimeAfterUndo = getRuntime();
      expect(runtimeAfterUndo).not.toBe(runtimeAfterEdit);
    });

    test("multiple charts: only the affected chart is re-created", () => {
      const otherChartId = "otherChart";
      createChart(model, { type: "bar", dataSets: [{ dataRange: "D1:D5" }] }, otherChartId);

      const runtime1 = getRuntime();
      const otherRuntime1 = model.getters.getChartRuntime(otherChartId);

      // Modify a cell only in the first chart's range
      setCellContent(model, "B3", "77");

      const runtime2 = getRuntime();
      const otherRuntime2 = model.getters.getChartRuntime(otherChartId);

      expect(runtime2).not.toBe(runtime1); // first chart invalidated
      expect(otherRuntime2).toBe(otherRuntime1); // second chart untouched
    });
  });

  describe("Gauge chart (dataRange)", () => {
    beforeEach(() => {
      createGaugeChart(model, { dataRange: "B1" }, chartId);
    });

    test("runtime is not re-created when a cell outside the data range changes", () => {
      const runtime1 = getRuntime();
      setCellContent(model, "C5", "10");
      const runtime2 = getRuntime();
      expect(runtime2).toBe(runtime1);
    });

    test("runtime is re-created when the data range cell changes", () => {
      const runtime1 = getRuntime();
      setCellContent(model, "B1", "50");
      const runtime2 = getRuntime();
      expect(runtime2).not.toBe(runtime1);
    });
  });

  describe("Scorecard chart (keyValue + baseline)", () => {
    beforeEach(() => {
      createScorecardChart(model, { keyValue: "B1", baseline: "B2" }, chartId);
    });

    test("runtime is not re-created when a cell outside both ranges changes", () => {
      const runtime1 = getRuntime();
      setCellContent(model, "C5", "10");
      const runtime2 = getRuntime();
      expect(runtime2).toBe(runtime1);
    });

    test("runtime is re-created when the keyValue cell changes", () => {
      const runtime1 = getRuntime();
      setCellContent(model, "B1", "500");
      const runtime2 = getRuntime();
      expect(runtime2).not.toBe(runtime1);
    });

    test("runtime is re-created when the baseline cell changes", () => {
      const runtime1 = getRuntime();
      setCellContent(model, "B2", "400");
      const runtime2 = getRuntime();
      expect(runtime2).not.toBe(runtime1);
    });
  });

  describe("Multi-sheet charts", () => {
    test("runtime is re-created when a cell on the chart's data sheet changes", () => {
      const sheet2Id = "sheet2";
      model.dispatch("CREATE_SHEET", { sheetId: sheet2Id, position: 1 });
      setCellContent(model, "A1", "10", sheet2Id);
      createChart(model, { type: "bar", dataSets: [{ dataRange: "Sheet2!A1:A5" }] }, chartId);
      const runtime1 = getRuntime();
      setCellContent(model, "A1", "99", sheet2Id);
      const runtime2 = getRuntime();
      expect(runtime2).not.toBe(runtime1);
    });

    test("runtime is not re-created when a cell on an unrelated sheet changes", () => {
      const sheet2Id = "sheet2";
      model.dispatch("CREATE_SHEET", { sheetId: sheet2Id, position: 1 });
      createChart(model, { type: "bar", dataSets: [{ dataRange: "A1:A5" }] }, chartId);
      const runtime1 = getRuntime();
      setCellContent(model, "A1", "99", sheet2Id);
      const runtime2 = getRuntime();
      expect(runtime2).toBe(runtime1);
    });
  });
});
