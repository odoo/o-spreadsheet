import { ClipboardHandler } from "../../clipboard_handlers/abstract_clipboard_handler";
import {
  applyClipboardHandlersPaste,
  getPasteTargetFromHandlers,
} from "../../helpers/clipboard/clipboard_helpers";
import { boundColRowOffsetInSheet } from "../../helpers/figures/figure/figure";
import { UuidGenerator } from "../../helpers/uuid";
import { positionToZone } from "../../helpers/zones";
import { clipboardHandlersRegistries } from "../../registries/clipboardHandlersRegistries";
import { ClipboardOptions, MinimalClipboardData } from "../../types/clipboard";
import { Command, CommandResult, MoveFiguresToSheetCommand } from "../../types/commands";
import { Figure, FigureUI } from "../../types/figure";
import { UID } from "../../types/misc";
import { UIPlugin } from "../ui_plugin";

export class FigureUIPlugin extends UIPlugin {
  static getters = ["getFigureUI"] as const;

  allowDispatch(cmd: Command): CommandResult | CommandResult[] {
    switch (cmd.type) {
      case "UPDATE_FIGURES":
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
      case "MOVE_FIGURES_TO_SHEET": {
        if (
          cmd.sheetId === cmd.sheetIdTo ||
          !this.getters.tryGetSheet(cmd.sheetIdTo) ||
          !cmd.figures.length
        ) {
          return CommandResult.InvalidSheetId;
        }
        if (cmd.figures.some(({ figureId }) => !this.getters.getFigure(cmd.sheetId, figureId))) {
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
        break;
      }
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
      case "UPDATE_FIGURES":
        for (const updateFigurePayload of cmd.figures) {
          this.dispatch("UPDATE_FIGURE", updateFigurePayload);
        }
        break;
      case "DELETE_FIGURES":
        for (const figureId of cmd.figureIds) {
          this.dispatch("DELETE_FIGURE", { figureId, sheetId: cmd.sheetId });
        }
        break;
      case "MOVE_FIGURES_TO_SHEET":
        this.moveFiguresToSheet(cmd);
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

  /**
   * Move figures to another sheet. The figures are re-created in the target sheet and deleted from
   * their original sheet, re-using the figure clipboard handlers so that the figures content is
   * correctly adapted to the new sheet (chart ranges are kept pointing to the original sheet).
   *
   * If the figures were dropped onto a chart or a carousel of the target sheet, they are merged
   * into a carousel once moved, as they would be in a single-sheet drag & drop.
   */
  private moveFiguresToSheet(cmd: MoveFiguresToSheetCommand) {
    const { sheetId, sheetIdTo, figures, overlappingFigureId } = cmd;
    const figureIds = figures.map((figure) => figure.figureId);

    const handlers: { handlerName: string; handler: ClipboardHandler<any> }[] =
      clipboardHandlersRegistries.figureHandlers.getKeys().map((handlerName) => {
        const Handler = clipboardHandlersRegistries.figureHandlers.get(handlerName);
        return { handlerName, handler: new Handler(this.getters, this.dispatch) };
      });
    const options: ClipboardOptions = { isCutOperation: true };
    const copiedData: MinimalClipboardData = { figureIds, sheetId };
    for (const { handlerName, handler } of handlers) {
      copiedData[handlerName] = handler.copy({ figureIds, sheetId }, options.isCutOperation);
    }

    const zones = [positionToZone({ col: figures[0].col, row: figures[0].row })];
    const { target } = getPasteTargetFromHandlers(sheetIdTo, zones, copiedData, handlers, options);
    applyClipboardHandlersPaste(handlers, copiedData, target, options);

    const movedFigureIds = target.figureIds ?? {};
    const overlappingFigure = overlappingFigureId
      ? this.getters.getFigure(sheetIdTo, overlappingFigureId)
      : undefined;
    if (!overlappingFigure) {
      // The paste positions the figures at the top left of the target zone: move them to the
      // exact position at which they were dropped.
      this.dispatch("UPDATE_FIGURES", {
        figures: figures.map((figure) => {
          const figureId = movedFigureIds[figure.figureId];
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
