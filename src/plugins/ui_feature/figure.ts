import { UuidGenerator } from "../../helpers/uuid";
import { figureRegistry } from "../../registries/figures_registry";
import { Command, CommandResult } from "../../types/commands";
import { UIPlugin } from "../ui_plugin";

export class FigureUIPlugin extends UIPlugin {
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
        const minSize = figureRegistry.get("carousel").minFigSize;
        this.dispatch("CREATE_CAROUSEL", {
          sheetId: cmd.sheetId,
          figureId: carouselFigureId,
          col: baseFigure.col,
          row: baseFigure.row,
          offset: baseFigure.offset,
          size: {
            width: Math.max(baseFigure.width, minSize),
            height: Math.max(baseFigure.height, minSize),
          },
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
