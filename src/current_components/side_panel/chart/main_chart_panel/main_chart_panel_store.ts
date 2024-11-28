import { chartRegistry, chartSubtypeRegistry } from "../../../../registries/chart_types";
import { SpreadsheetStore } from "../../../../stores";
import { ChartCreationContext, ChartDefinition, UID } from "../../../../types";

export class MainChartPanelStore extends SpreadsheetStore {
  mutators = ["activatePanel", "changeChartType"] as const;
  panel: "configuration" | "design" = "configuration";
  private creationContext: ChartCreationContext = {};

  activatePanel(panel: "configuration" | "design") {
    this.panel = panel;
  }

  changeChartType(figureId: UID, newDisplayType: string) {
    this.creationContext = {
      ...this.creationContext,
      ...this.getters.getContextCreationChart(figureId),
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
    const contextCreation = {
      ...this.creationContext,
      ...this.getters.getContextCreationChart(figureId),
    };
    return {
      ...ChartClass.getChartDefinitionFromContextCreation(contextCreation),
      ...newChartInfo.subtypeDefinition,
    } as ChartDefinition;
  }
}
