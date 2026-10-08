import { SpreadsheetChart } from "../helpers/figures/chart";
import { boundColRowOffsetInSheet } from "../helpers/figures/figure/figure";
import { UuidGenerator } from "../helpers/uuid";
import { ChartDefinition } from "../types/chart/chart";
import { ClipboardFigureData, ClipboardOptions, ClipboardPasteTarget } from "../types/clipboard";
import { CommandResult } from "../types/commands";
import { Figure } from "../types/figure";
import { PixelPosition, UID, Zone } from "../types/misc";
import { AbstractFigureClipboardHandler } from "./abstract_figure_clipboard_handler";

type ClipboardContent = {
  figures: ClipboardCharts[];
  figureIds: UID[];
};

type ClipboardCharts = {
  figureId: UID;
  copiedFigure: Figure;
  copiedChart: SpreadsheetChart;
  offset: PixelPosition;
};

export class ChartClipboardHandler extends AbstractFigureClipboardHandler<ClipboardContent> {
  copy(data: ClipboardFigureData): ClipboardContent | undefined {
    const sheetId = data.sheetId;
    const figures: ClipboardCharts[] = [];
    const copyRect = this.getCopyRect(data);
    for (const figureId of data.figureIds) {
      const figure = this.getters.getFigure(sheetId, figureId);
      if (!figure) {
        throw new Error(`No figure for the given id: ${figureId}`);
      }
      if (figure.tag !== "chart") {
        continue;
      }
      const copiedFigure = { ...figure };
      const { x, y } = this.getters.getFigureUI(sheetId, figure);
      const chart = this.getters.getChartFromFigureId(figureId);
      if (!chart) {
        throw new Error(`No chart for the given id: ${figureId}`);
      }
      figures.push({
        figureId,
        copiedFigure,
        copiedChart: chart,
        offset: { x: x - copyRect.x, y: y - copyRect.y },
      });
    }
    return { figures, figureIds: data.figureIds };
  }

  getPasteTarget(
    sheetId: UID,
    target: Zone[],
    content: ClipboardContent,
    options?: ClipboardOptions
  ): ClipboardPasteTarget {
    const figureIds = {};
    for (const figure of content.figures) {
      figureIds[figure.figureId] = UuidGenerator.smallUuid();
    }
    return { zones: [], figureIds, sheetId };
  }

  paste(target: ClipboardPasteTarget, clippedContent: ClipboardContent, options: ClipboardOptions) {
    if (!target.figureIds) {
      return;
    }
    const { zones } = target;
    const sheetId = target.sheetId;
    let carouselFigureId: UID | undefined;
    for (const clippedFigure of clippedContent.figures) {
      const figureId = target.figureIds[clippedFigure.figureId];
      const { width, height } = clippedFigure.copiedFigure;
      const copy = clippedFigure.copiedChart;
      let copiedDefinition = SpreadsheetChart.fromDefinition(
        this.getters,
        sheetId,
        copy.copyInSheetId(sheetId)
      ).getDefinition();

      // parse the definition to filter out ranges that became invalid since the copy.
      copiedDefinition = SpreadsheetChart.fromStrDefinition(
        this.getters,
        sheetId,
        copiedDefinition
      ).getDefinition();
      if (options.targetFigureId) {
        carouselFigureId = this.pasteChartInCarousel(
          sheetId,
          carouselFigureId ?? options.targetFigureId,
          copiedDefinition
        );
      } else {
        const { col, row, offset } = boundColRowOffsetInSheet(
          this.getters,
          sheetId,
          { col: zones[0].left, row: zones[0].top },
          { ...clippedFigure.copiedFigure, offset: clippedFigure.offset }
        );
        this.dispatch("CREATE_CHART", {
          figureId,
          chartId: UuidGenerator.smallUuid(),
          sheetId,
          definition: copiedDefinition,
          col,
          row,
          offset,
          size: { height, width },
        });
      }

      if (options.isCutOperation) {
        this.dispatch("DELETE_FIGURE", {
          sheetId: clippedFigure.copiedChart.sheetId,
          figureId: clippedFigure.copiedFigure.id,
        });
      }
      if (!carouselFigureId) {
        this.dispatch("SELECT_FIGURE", {
          figureId,
          selectMultiple: clippedContent.figureIds.length > 1,
        });
      }
    }
    if (carouselFigureId) {
      this.dispatch("SELECT_FIGURE", { figureId: carouselFigureId });
    }
  }

  /**
   * Paste the chart into the target carousel, or merge it with the target chart
   * into a new carousel. Returns the id of the carousel figure.
   */
  private pasteChartInCarousel(
    sheetId: UID,
    targetFigureId: UID,
    definition: ChartDefinition<string>
  ): UID {
    const targetFigure = this.getters.getFigure(sheetId, targetFigureId);
    const newChartId = UuidGenerator.smallUuid();
    switch (targetFigure?.tag) {
      case "carousel":
        this.dispatch("ADD_NEW_CHART_TO_CAROUSEL", {
          sheetId,
          carouselId: targetFigureId,
          newChartId,
          chartDefinition: definition,
        });
        return targetFigureId;
      case "chart":
        this.dispatch("CREATE_CHART_AND_MERGE_INTO_CAROUSEL", {
          newChartId,
          sheetId,
          definition,
          baseFigureId: targetFigureId,
          newCarouselId: UuidGenerator.smallUuid(),
        });
        return this.getters.getFigureIdFromChartId(newChartId);
      default:
        throw new Error(`Cannot paste into figure of type ${targetFigure?.tag}`);
    }
  }

  isPasteAllowed(sheetId: UID, target: Zone[], content: any, option?: ClipboardOptions) {
    if (target.length === 0) {
      return CommandResult.EmptyTarget;
    }
    if (option?.pasteOption !== undefined) {
      return CommandResult.WrongFigurePasteOption;
    }
    return CommandResult.Success;
  }
}
