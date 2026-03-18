import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { GaugeChartRuntime, ScorecardChartRuntime } from "@odoo/o-spreadsheet-engine/types/chart";
import { Model } from "../../../src";
import { Color, UID } from "../../../src/types";
import {
  activateSheet,
  addEqualCf,
  createChart,
  createGaugeChart,
  createScorecardChart,
  createSheet,
  duplicateSheet,
  setCellContent,
  setFormatting,
  updateFigure,
} from "../../test_helpers/commands_helpers";
import { createModel } from "../../test_helpers/helpers";

describe("Single cell chart background color", () => {
  let model: Model;
  let sheetId: UID;
  const chartId = "thisIsAnId";

  function getGaugeOrScorecardRuntime(
    model: Model,
    chartId: UID
  ): GaugeChartRuntime | ScorecardChartRuntime {
    return model.getters.getChartRuntime(chartId) as GaugeChartRuntime | ScorecardChartRuntime;
  }

  beforeEach(async () => {
    model = await createModel();
    sheetId = model.getters.getActiveSheetId();
    await setCellContent(model, "A1", "1");
  });

  async function addCfToA1(fillColor: Color) {
    await addEqualCf(model, "A1", { fillColor }, "1");
  }

  async function addFillToA1(color: Color) {
    await setFormatting(model, "A1", { fillColor: color });
  }

  async function createTestChart(chartType: string, mainCell: string, background?: Color) {
    if (chartType === "scorecard") {
      await createScorecardChart(model, { background, keyValue: mainCell }, chartId);
    } else if (chartType === "gauge") {
      await createGaugeChart(model, { background, dataRange: mainCell }, chartId);
    }
  }

  test.each(["scorecard", "gauge"])(
    "chart %s background color change with main cell CF background color",
    async (chartType: string) => {
      await createTestChart(chartType, "A1");
      expect(getGaugeOrScorecardRuntime(model, chartId).background).toEqual(BACKGROUND_CHART_COLOR);
      await addCfToA1("#FF0000");
      expect(getGaugeOrScorecardRuntime(model, chartId).background).toEqual("#FF0000");
      await setCellContent(model, "A1", "random value not in CF");
      expect(getGaugeOrScorecardRuntime(model, chartId).background).toEqual(BACKGROUND_CHART_COLOR);
    }
  );

  test.each(["scorecard", "gauge"])(
    "chart %s background color change with main cell background color",
    async (chartType: string) => {
      await createTestChart(chartType, "A1");
      expect(getGaugeOrScorecardRuntime(model, chartId).background).toEqual(BACKGROUND_CHART_COLOR);
      await addFillToA1("#00FF00");
      expect(getGaugeOrScorecardRuntime(model, chartId).background).toEqual("#00FF00");
    }
  );

  test.each(["scorecard", "gauge"])(
    "CF color have priority over cell background color",
    async (chartType: string) => {
      await addCfToA1("#FF0000");
      await addFillToA1("#00FF00");
      await createTestChart(chartType, "A1");
      expect(getGaugeOrScorecardRuntime(model, chartId).background).toEqual("#FF0000");
    }
  );

  test.each(["scorecard", "gauge"])(
    "chart background color have priority over CF color",
    async (chartType: string) => {
      await addCfToA1("#FF0000");
      await createTestChart(chartType, "A1", "#0000FF");
      expect(getGaugeOrScorecardRuntime(model, chartId).background).toEqual("#0000FF");
    }
  );

  test.each(["scorecard", "gauge"])(
    "Chart style change based on CF of another sheet",
    async (chartType: string) => {
      await createSheet(model, { sheetId: "sheet2" });
      await activateSheet(model, "sheet2");
      await setCellContent(model, "A1", "1", sheetId);
      await addEqualCf(model, "A1", { fillColor: "#000FFF" }, "1", "cfId", sheetId);
      const sheet1Name = model.getters.getSheetName(sheetId);
      await createTestChart(chartType, `${sheet1Name}!A1`);
      expect(getGaugeOrScorecardRuntime(model, chartId).background).toEqual("#000FFF");
    }
  );

  test("Duplicating a sheet preserves the figure dimensions", async () => {
    const firstSheetId = model.getters.getActiveSheetId();
    const secondSheetId = "42";
    await createChart(model, { type: "bar" });
    const firstSheetFigures = model.getters.getFigures(firstSheetId);
    expect(firstSheetFigures.length).toBe(1);
    await updateFigure(model, {
      sheetId,
      figureId: firstSheetFigures[0].id,
      offset: {
        x: 0,
        y: 0,
      },
      width: 123,
      height: 321,
      col: 0,
      row: 0,
    });
    await duplicateSheet(model, firstSheetId, secondSheetId);
    const secondSheetFigures = model.getters.getFigures(secondSheetId);
    expect(secondSheetFigures.length).toBe(1);
    expect(firstSheetFigures[0]).toMatchObject({
      ...secondSheetFigures[0],
      id: expect.any(String),
    });
  });
});
