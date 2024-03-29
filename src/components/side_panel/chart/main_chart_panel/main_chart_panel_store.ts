import { getChartDefinitionFromContextCreation } from "../../../../helpers/figures/charts";
import { SpreadsheetStore } from "../../../../stores";
import { ChartCreationContext, ChartType, UID } from "../../../../types";

export class MainChartPanelStore extends SpreadsheetStore {
  panel: "configuration" | "design" = "configuration";
  private creationContext: ChartCreationContext = {};

  activatePanel(panel: "configuration" | "design") {
    this.panel = panel;
  }

  changeChartType(figureId: UID, type: ChartType) {
    this.creationContext = {
      ...this.creationContext,
      ...this.getters.getContextCreationChart(figureId),
    };
    const sheetId = this.getters.getFigureSheetId(figureId);
    if (!sheetId) {
      return;
    }
    const definition = getChartDefinitionFromContextCreation(this.creationContext, type);
    this.model.dispatch("UPDATE_CHART", {
      definition,
      id: figureId,
      sheetId,
    });
  }
}
