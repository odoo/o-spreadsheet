import { UuidGenerator } from "../../helpers/uuid";
import { Command, CommandResult } from "../../types/commands";
import { Figure, FigureUI } from "../../types/figure";
import { UID } from "../../types/misc";
import { UIPlugin } from "../ui_plugin";

export class FigureUIPlugin extends UIPlugin {
  static getters = ["getFigureUI"] as const;

  allowDispatch(cmd: Command): CommandResult | CommandResult[] {
    switch (cmd.type) {
      case "MOVE_FIGURES":
        for (const updateFigurePayload of cmd.figures) {
          const result = this.canDispatch("UPDATE_FIGURE", updateFigurePayload);
          if (!result.isSuccessful) {
            return result.reasons;
          }
        }
        break;
      case "DELETE_FIGURES":
        for (const figureId of cmd.figureIds) {
          if (!this.getters.getFigure(cmd.sheetId, figureId)) {
            return CommandResult.FigureDoesNotExist;
          }
        }
        break;
      case "MERGE_CHART_FIGURES_INTO_CAROUSEL":
        const figures = cmd.chartFigureIds.map((id) => this.getters.getFigure(cmd.sheetId, id));
        const baseFigureId = this.getters.getFigure(cmd.sheetId, cmd.baseFigureId);
        if (
          figures.some((f) => f === undefined || f.tag !== "chart") ||
          !baseFigureId ||
          baseFigureId.tag !== "chart"
        ) {
          return CommandResult.FigureDoesNotExist;
        }
        break;
      case "CREATE_CHART_INTO_CAROUSEL":
        if (
          this.getters.getFigure(cmd.sheetId, cmd.figureId) ||
          !this.getters.doesCarouselExist(cmd.carouselId)
        ) {
          return CommandResult.InvalidFigureId;
        }
        break;
      case "CREATE_CHART_AND_MERGE_INTO_CAROUSEL":
        const baseFigure = this.getters.getFigure(cmd.sheetId, cmd.baseFigureId);
        if (this.getters.getFigure(cmd.sheetId, cmd.figureId) || !baseFigure) {
          return CommandResult.InvalidFigureId;
        }
        if (baseFigure.tag !== "chart") {
          return CommandResult.FigureDoesNotExist;
        }
        break;
    }
    return CommandResult.Success;
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "MOVE_FIGURES":
        for (const updateFigurePayload of cmd.figures) {
          this.dispatch("UPDATE_FIGURE", updateFigurePayload);
        }
        break;
      case "DELETE_FIGURES":
        for (const figureId of cmd.figureIds) {
          this.dispatch("DELETE_FIGURE", { figureId, sheetId: cmd.sheetId });
        }
        break;
      case "MERGE_CHART_FIGURES_INTO_CAROUSEL":
        const carouselFigureId = UuidGenerator.smallUuid();
        const baseFigure = this.getters.getFigure(cmd.sheetId, cmd.baseFigureId);
        if (!baseFigure) {
          throw new Error(`Figure ${cmd.baseFigureId} does not exists.`);
        }
        this.dispatch("CREATE_CAROUSEL", {
          sheetId: cmd.sheetId,
          figureId: carouselFigureId,
          col: baseFigure.col,
          row: baseFigure.row,
          offset: baseFigure.offset,
          size: { width: baseFigure.width, height: baseFigure.height },
          definition: { items: [] },
        });
        this.dispatch("ADD_FIGURES_CHART_TO_CAROUSEL", {
          sheetId: cmd.sheetId,
          carouselFigureId,
          chartFigureIds: cmd.chartFigureIds,
        });
        break;
      case "CREATE_CHART_INTO_CAROUSEL":
        this.dispatch("CREATE_CHART", {
          chartId: cmd.chartId,
          figureId: cmd.figureId,
          sheetId: cmd.sheetId,
          size: cmd.size,
          definition: cmd.definition,
          col: cmd.col,
          row: cmd.row,
          offset: cmd.offset,
        });
        this.dispatch("ADD_FIGURES_CHART_TO_CAROUSEL", {
          sheetId: cmd.sheetId,
          carouselFigureId: cmd.carouselId,
          chartFigureIds: [cmd.figureId],
        });
        break;
      case "CREATE_CHART_AND_MERGE_INTO_CAROUSEL":
        const baseFigureToMerge = this.getters.getFigure(cmd.sheetId, cmd.baseFigureId);
        if (!baseFigureToMerge) {
          throw new Error(`Figure ${cmd.baseFigureId} does not exists.`);
        }
        this.dispatch("CREATE_CHART", {
          chartId: cmd.chartId,
          figureId: cmd.figureId,
          sheetId: cmd.sheetId,
          definition: cmd.definition,
          col: baseFigureToMerge.col,
          row: baseFigureToMerge.row,
          offset: baseFigureToMerge.offset,
          size: { width: baseFigureToMerge.width, height: baseFigureToMerge.height },
        });
        this.dispatch("MERGE_CHART_FIGURES_INTO_CAROUSEL", {
          sheetId: cmd.sheetId,
          baseFigureId: cmd.baseFigureId,
          chartFigureIds: [cmd.baseFigureId, cmd.figureId],
        });
        break;
    }
  }

  getFigureUI(sheetId: UID, figure: Figure): FigureUI {
    const x = figure.offset.x + this.getters.getColDimensions(sheetId, figure.col).start;
    const y = figure.offset.y + this.getters.getRowDimensions(sheetId, figure.row).start;
    return { ...figure, x, y };
  }
}
