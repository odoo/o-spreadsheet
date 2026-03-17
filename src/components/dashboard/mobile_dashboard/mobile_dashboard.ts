import { Figure } from "@odoo/o-spreadsheet-engine/types/figure";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component } from "@odoo/owl";
import { figureRegistry } from "../../../registries/figures_registry";

const EMPTY_FIGURE = { tag: "empty" } as const;

type MobileFigure = Figure | typeof EMPTY_FIGURE;

export class MobileDashboard extends Component<{}, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.MobileDashboard";
  static props = {
    spreadsheetModel: Object,
  };

  get figureRows(): MobileFigure[][] {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const sortedFigures = this.env.model.getters
      .getFigures(sheetId)
      .sort((f1, f2) => (this.isBefore(f1, f2) ? -1 : 1));

    const figureRows: MobileFigure[][] = [];
    for (let i = 0; i < sortedFigures.length; i++) {
      const figure = sortedFigures[i];
      const nextFigure = sortedFigures[i + 1];
      if (this.isScorecard(figure) && nextFigure && this.isScorecard(nextFigure)) {
        figureRows.push([figure, nextFigure]);
        i++;
      } else if (this.isScorecard(figure)) {
        figureRows.push([figure, EMPTY_FIGURE]);
      } else {
        figureRows.push([figure]);
      }
    }
    return figureRows;
  }

  getFigureComponent(figure: Figure) {
    return figureRegistry.get(figure.tag).Component;
  }

  isBefore(f1: Figure, f2: Figure) {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const fig1 = this.env.model.getters.getFigureUI(sheetId, f1);
    const fig2 = this.env.model.getters.getFigureUI(sheetId, f2);
    return fig1.x < fig2.x ? fig1.y < fig2.y : fig1.y < fig2.y;
  }

  isScorecard(figure) {
    if (figure.tag !== "chart") {
      return false;
    }
    const chartId = this.env.model.getters.getChartIdFromFigureId(figure.id);
    if (!chartId) {
      return false;
    }
    const definition = this.env.model.getters.getChartDefinition(chartId);
    return definition.type === "scorecard";
  }
}
