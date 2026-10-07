import { ClipboardHandler } from "../../clipboard_handlers/abstract_clipboard_handler";
import {
  applyClipboardHandlersPaste,
  getPasteTargetFromHandlers,
} from "../../helpers/clipboard/clipboard_helpers";
import { boundColRowOffsetInSheet } from "../../helpers/figures/figure/figure";
import { UuidGenerator } from "../../helpers/uuid";
import { clipboardHandlersRegistries } from "../../registries/clipboard_handlers_registries";
import { ClipboardOptions, MinimalClipboardData } from "../../types/clipboard";
import {
  CommandResult,
  CreateChartAndMergeIntoCarouselCommand,
  DeleteFiguresCommand,
  MergeIntoCarouselCommand,
  MoveFiguresToSheetCommand,
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
    MOVE_FIGURES_TO_SHEET: this.checkCanMoveFiguresToSheet,
  };

  handlers = {
    UPDATE_FIGURES: this.onUpdateFigures,
    DELETE_FIGURES: this.onDeleteFigures,
    MERGE_CHART_FIGURES_INTO_CAROUSEL: this.onMergeChartFiguresIntoCarousel,
    CREATE_CHART_AND_MERGE_INTO_CAROUSEL: this.onCreateChartAndMergeIntoCarousel,
    MOVE_FIGURES_TO_SHEET: this.onMoveFiguresToSheet,
  };

  private onCreateChartAndMergeIntoCarousel(cmd: CreateChartAndMergeIntoCarouselCommand) {
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

  private onMergeChartFiguresIntoCarousel(cmd: MergeIntoCarouselCommand) {
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

  private onDeleteFigures(cmd: DeleteFiguresCommand) {
    for (const figureId of cmd.figureIds) {
      this.dispatch("DELETE_FIGURE", { figureId, sheetId: cmd.sheetId });
    }
  }

  private onUpdateFigures(cmd: UpdateFiguresCommand) {
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

  private checkCanMoveFiguresToSheet(cmd: MoveFiguresToSheetCommand) {
    if (
      cmd.sheetId === cmd.sheetIdTo ||
      !this.getters.tryGetSheet(cmd.sheetIdTo) ||
      !cmd.figures.length
    ) {
      return CommandResult.InvalidSheetId;
    }
    if (cmd.figures.some(({ id }) => !this.getters.getFigure(cmd.sheetId, id))) {
      return CommandResult.FigureDoesNotExist;
    }
    const overlappingFigure = cmd.overlappingFigureId
      ? this.getters.getFigure(cmd.sheetIdTo, cmd.overlappingFigureId)
      : undefined;
    if (
      cmd.overlappingFigureId &&
      (!overlappingFigure || !["chart", "carousel"].includes(overlappingFigure.tag))
    ) {
      return CommandResult.InvalidFigureId;
    }
    return CommandResult.Success;
  }

  /**
   * Move figures to another sheet, either in a as normal figures or merged into a carousel if dropped onto a chart/carousel.
   */
  private onMoveFiguresToSheet(cmd: MoveFiguresToSheetCommand) {
    const { sheetId, sheetIdTo, figures, overlappingFigureId } = cmd;
    const figureIds = figures.map((figure) => figure.id);

    const handlers: { handlerName: string; handler: ClipboardHandler<any> }[] =
      clipboardHandlersRegistries.figureHandlers.getKeys().map((handlerName) => {
        const Handler = clipboardHandlersRegistries.figureHandlers.get(handlerName);
        return { handlerName, handler: new Handler(this.getters, this.dispatch) };
      });
    const options: ClipboardOptions = { isCutOperation: true };
    const copiedData: MinimalClipboardData = { figureIds, sheetId, zones: [] };
    for (const { handlerName, handler } of handlers) {
      copiedData[handlerName] = handler.copy({ figureIds, sheetId }, options.isCutOperation);
    }

    // Paste at A1, we will move them later since clipboard do not support exact pixel positions to paste figures
    const zones = [{ left: 0, top: 0, right: 0, bottom: 0 }];
    const { target } = getPasteTargetFromHandlers(sheetIdTo, zones, handlers, copiedData, options);
    applyClipboardHandlersPaste(handlers, copiedData, target, options, {
      sheetId: copiedData.sheetId,
      zones: copiedData.zones,
    });

    const movedFigureIds = target.figureIds ?? {};
    const overlappingFigure = overlappingFigureId
      ? this.getters.getFigure(sheetIdTo, overlappingFigureId)
      : undefined;
    if (!overlappingFigure) {
      // Move figures to correct position
      this.dispatch("UPDATE_FIGURES", {
        figures: figures.map((figure) => {
          const figureId = movedFigureIds[figure.id];
          const movedFigure = { ...this.getters.getFigure(sheetIdTo, figureId)!, ...figure };
          const { col, row } = movedFigure;
          return {
            sheetId: sheetIdTo,
            figureId,
            width: movedFigure.width,
            height: movedFigure.height,
            ...boundColRowOffsetInSheet(this.getters, sheetIdTo, { col, row }, movedFigure),
          };
        }),
      });
    } else if (overlappingFigure.tag === "carousel") {
      this.dispatch("ADD_FIGURES_CHART_TO_CAROUSEL", {
        sheetId: sheetIdTo,
        carouselFigureId: overlappingFigure.id,
        chartFigureIds: figureIds.map((figureId) => movedFigureIds[figureId]),
      });
    } else {
      this.dispatch("MERGE_CHART_FIGURES_INTO_CAROUSEL", {
        sheetId: sheetIdTo,
        baseFigureId: overlappingFigure.id,
        chartFigureIds: [
          overlappingFigure.id,
          ...figureIds.map((figureId) => movedFigureIds[figureId]),
        ],
      });
    }
  }

  getFigureUI(sheetId: UID, figure: Figure): FigureUI {
    const x = figure.offset.x + this.getters.getColDimensions(sheetId, figure.col).start;
    const y = figure.offset.y + this.getters.getRowDimensions(sheetId, figure.row).start;
    return { ...figure, x, y };
  }
}
