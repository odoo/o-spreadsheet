import { deepEquals } from "../../../../helpers";
import { chartRegistry, chartSubtypeRegistry } from "../../../../registries/chart_types";
import { SpreadsheetStore } from "../../../../stores";
import { ChartCreationContext, ChartDefinition, UID } from "../../../../types";

export class MainChartPanelStore extends SpreadsheetStore {
  mutators = ["activatePanel", "changeChartType"] as const;
  panel: "configuration" | "design" = "configuration";
  private creationContexts: Record<UID, ChartCreationContext> = {};

  activatePanel(panel: "configuration" | "design") {
    this.panel = panel;
  }

  changeChartType(figureId: UID, newDisplayType: string) {
    const currentCreationContext = this.getters.getContextCreationChart(figureId);
    const savedCreationContext = this.creationContexts[figureId] || {};

    let newRanges = currentCreationContext?.range;
    if (newRanges?.every((range, i) => deepEquals(range, savedCreationContext.range?.[i]))) {
      newRanges = Object.assign([], savedCreationContext.range, currentCreationContext?.range);
    }

    this.creationContexts[figureId] = {
      ...savedCreationContext,
      ...currentCreationContext,
      range: newRanges,
    };
    const sheetId = this.getters.getFigureSheetId(figureId);
    if (!sheetId) {
      return;
    }
    const definition = this.getChartDefinitionFromContextCreation(figureId, newDisplayType);
    this.model.dispatch("UPDATE_CHART", {
      definition,
      id: figureId,
      sheetId,
    });
  }

  private getChartDefinitionFromContextCreation(
    figureId: UID,
    newDisplayType: string
  ): ChartDefinition {
    const newChartInfo = chartSubtypeRegistry.get(newDisplayType);
    const ChartClass = chartRegistry.get(newChartInfo.chartType);
    return {
      ...ChartClass.getChartDefinitionFromContextCreation(this.creationContexts[figureId]),
      ...newChartInfo.subtypeDefinition,
    } as ChartDefinition;
  }
}
