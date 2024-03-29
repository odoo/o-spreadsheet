import { getChartDefinitionFromContextCreation } from "../../../../helpers/figures/charts";
import { SpreadsheetStore } from "../../../../stores";
import { ChartType, UID } from "../../../../types";

export class MainChartPanelStore extends SpreadsheetStore {
  panel: "configuration" | "design" = "configuration";

  activatePanel(panel: "configuration" | "design") {
    this.panel = panel;
  }

  changeChartType(figureId: UID, type: ChartType) {
    const context = this.getters.getContextCreationChart(figureId);
    const sheetId = this.getters.getFigureSheetId(figureId);
    if (!context || !sheetId) {
      return;
    }
    const definition = getChartDefinitionFromContextCreation(context, type);
    this.model.dispatch("UPDATE_CHART", {
      definition,
      id: figureId,
      sheetId,
    });
  }
}
