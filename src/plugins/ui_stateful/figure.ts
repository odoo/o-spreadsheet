import { UuidGenerator } from "../../helpers/uuid";
import {
  CommandResult,
  CreateChartAndMergeIntoCarouselCommand,
  DeleteFiguresCommand,
  MergeIntoCarouselCommand,
  UpdateFiguresCommand,
} from "../../types/commands";
import { Figure, FigureUI } from "../../types/figure";
import { UID } from "../../types/misc";
import { UIPlugin } from "../ui_plugin";

export class FigureUIPlugin extends UIPlugin {
  static getters = ["getFigureUI"] as const;

  validators = {
    UPDATE_FIGURES: this.checkUpdateFigures,
    DELETE_FIGURES: this.checkFiguresExist,
    MERGE_CHART_FIGURES_INTO_CAROUSEL: this.checkMergedFiguresAreCharts,
    CREATE_CHART_AND_MERGE_INTO_CAROUSEL: this.checkCreateChartAndMerge,
  };

  handlers = {
    UPDATE_FIGURES: this.updateFigures,
    DELETE_FIGURES: this.deleteFigures,
    MERGE_CHART_FIGURES_INTO_CAROUSEL: this.mergeChartFiguresIntoCarousel,
    CREATE_CHART_AND_MERGE_INTO_CAROUSEL: this.createChartAndMergeIntoCarousel,
  };

  private createChartAndMergeIntoCarousel(cmd: CreateChartAndMergeIntoCarouselCommand) {
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
  }

  private mergeChartFiguresIntoCarousel(cmd: MergeIntoCarouselCommand) {
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
  }

  private deleteFigures(cmd: DeleteFiguresCommand) {
    for (const figureId of cmd.figureIds) {
      this.dispatch("DELETE_FIGURE", { figureId, sheetId: cmd.sheetId });
    }
  }

  private updateFigures(cmd: UpdateFiguresCommand) {
    for (const updateFigurePayload of cmd.figures) {
      this.dispatch("UPDATE_FIGURE", updateFigurePayload);
    }
  }

  private checkUpdateFigures(cmd: UpdateFiguresCommand) {
    for (const updateFigurePayload of cmd.figures) {
      const result = this.canDispatch("UPDATE_FIGURE", updateFigurePayload);
      if (!result.isSuccessful) {
        return result.reasons;
      }
    }
    return CommandResult.Success;
  }

  private checkFiguresExist(cmd: DeleteFiguresCommand) {
    for (const figureId of cmd.figureIds) {
      if (!this.getters.getFigure(cmd.sheetId, figureId)) {
        return CommandResult.FigureDoesNotExist;
      }
    }
    return CommandResult.Success;
  }

  private checkMergedFiguresAreCharts(cmd: MergeIntoCarouselCommand) {
    const figures = cmd.chartFigureIds.map((id) => this.getters.getFigure(cmd.sheetId, id));
    const baseFigure = this.getters.getFigure(cmd.sheetId, cmd.baseFigureId);
    if (
      figures.some((f) => f === undefined || f.tag !== "chart") ||
      !baseFigure ||
      baseFigure.tag !== "chart"
    ) {
      return CommandResult.FigureDoesNotExist;
    }
    return CommandResult.Success;
  }

  private checkCreateChartAndMerge(cmd: CreateChartAndMergeIntoCarouselCommand) {
    const baseFigure = this.getters.getFigure(cmd.sheetId, cmd.baseFigureId);
    if (this.getters.getFigure(cmd.sheetId, cmd.figureId) || !baseFigure) {
      return CommandResult.InvalidFigureId;
    }
    return baseFigure.tag !== "chart" ? CommandResult.FigureDoesNotExist : CommandResult.Success;
  }

  getFigureUI(sheetId: UID, figure: Figure): FigureUI {
    const x = figure.offset.x + this.getters.getColDimensions(sheetId, figure.col).start;
    const y = figure.offset.y + this.getters.getRowDimensions(sheetId, figure.row).start;
    return { ...figure, x, y };
  }
}
