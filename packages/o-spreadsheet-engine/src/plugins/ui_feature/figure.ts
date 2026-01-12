import { UuidGenerator } from "../../helpers";
import { Command, CommandResult } from "../../types/commands";
import { UIPlugin } from "../ui_plugin";

const uuidGenerator = new UuidGenerator();

export class FigureUIPlugin extends UIPlugin {
  allowDispatch(cmd: Command): CommandResult | CommandResult[] {
    switch (cmd.type) {
      case "MOVE_FIGURES":
        for (const subCommand of cmd.commands) {
          const result = this.allowDispatch({ type: "UPDATE_FIGURE", ...subCommand });
          if (result !== CommandResult.Success) {
            return result;
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
      case "MERGE_INTO_CAROUSEL":
        const figures = cmd.chartFigureIds.map((id) => this.getters.getFigure(cmd.sheetId, id));
        if (figures.some((f) => f === undefined || f.tag !== "chart")) {
          return CommandResult.FigureDoesNotExist;
        }
    }
    return CommandResult.Success;
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "MOVE_FIGURES":
        for (const subCommand of cmd.commands) {
          this.dispatch("UPDATE_FIGURE", subCommand);
        }
        break;
      case "DELETE_FIGURES":
        for (const figureId of cmd.figureIds) {
          this.dispatch("DELETE_FIGURE", { figureId, sheetId: cmd.sheetId });
        }
        break;
      case "MERGE_INTO_CAROUSEL":
        const carouselFigureId = uuidGenerator.smallUuid();
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
    }
  }
}
