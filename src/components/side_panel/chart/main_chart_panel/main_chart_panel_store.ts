import {
  chartRegistry,
  chartSubtypeRegistry,
} from "@odoo/o-spreadsheet-engine/registries/chart_types";
import { deepEquals } from "../../../../helpers";
import { SpreadsheetStore } from "../../../../stores";
import { ChartCreationContext, ChartDefinition, UID } from "../../../../types";

export class MainChartPanelStore extends SpreadsheetStore {
  mutators = ["activatePanel", "changeChartType"] as const;
  panel: "configuration" | "design" = "configuration";
  private creationContexts: Record<UID, ChartCreationContext> = {};

  activatePanel(panel: "configuration" | "design") {
    this.panel = panel;
  }

  changeChartType(chartId: UID, newDisplayType: string) {
    const currentCreationContext = this.getters.getContextCreationChart(chartId);
    const savedCreationContext = this.creationContexts[chartId] || {};

    let newRanges = currentCreationContext?.range;
    if (newRanges?.every((range, i) => deepEquals(range, savedCreationContext.range?.[i]))) {
      newRanges = Object.assign([], savedCreationContext.range, currentCreationContext?.range);
    }

    this.creationContexts[chartId] = {
      ...savedCreationContext,
      ...currentCreationContext,
      range: newRanges,
    };
    const figureId = this.getters.getFigureIdFromChartId(chartId);
    const sheetId = this.getters.getFigureSheetId(figureId);
    if (!sheetId) {
      return;
    }
    const definition = this.getChartDefinitionFromContextCreation(chartId, newDisplayType);
    this.model.dispatch("UPDATE_CHART", {
      definition,
      chartId,
      figureId,
      sheetId,
    });
  }

  private getChartDefinitionFromContextCreation(
    chartId: UID,
    newDisplayType: string
  ): ChartDefinition {
    const newChartInfo = chartSubtypeRegistry.get(newDisplayType);
    const ChartClass = chartRegistry.get(newChartInfo.chartType);
    return {
      ...ChartClass.getChartDefinitionFromContextCreation(this.creationContexts[chartId]),
      ...newChartInfo.subtypeDefinition,
    } as ChartDefinition;
  }
}
