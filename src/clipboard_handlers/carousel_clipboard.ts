import { AbstractFigureClipboardHandler } from "@odoo/o-spreadsheet-engine/clipboard_handlers/abstract_figure_clipboard_handler";
import { deepCopy, UuidGenerator } from "../helpers";
import { AbstractChart } from "../helpers/figures/charts";
import {
  Carousel,
  ClipboardFigureData,
  ClipboardOptions,
  ClipboardPasteTarget,
  CommandResult,
  Figure,
  PixelPosition,
  UID,
  Zone,
} from "../types";

type ClipboardContent = {
  figures: ClipboardCarousel[];
  figureIds: UID[];
};

type ClipboardCarousel = {
  figureId: UID;
  copiedSheetId: UID;
  copiedFigure: Figure;
  copiedCarousel: Carousel;
  copiedCharts: { [chartId: UID]: AbstractChart };
  offset: PixelPosition;
};

export class CarouselClipboardHandler extends AbstractFigureClipboardHandler<ClipboardContent> {
  copy(data: ClipboardFigureData): ClipboardContent | undefined {
    const sheetId = data.sheetId;
    const figures: ClipboardCarousel[] = [];
    for (const figureId of data.figureIds) {
      const figure = this.getters.getFigure(sheetId, figureId);
      if (!figure) {
        throw new Error(`No figure for the given id: ${figureId}`);
      }
      if (figure.tag !== "carousel") {
        continue;
      }
      const copiedFigure = { ...figure };
      const copiedCarousel = this.getters.getCarousel(figureId);
      const { x, y } = this.getters.getFigureUI(sheetId, figure);
      const copiedCharts: { [chartId: UID]: AbstractChart } = {};
      for (const item of copiedCarousel.items) {
        if (item.type === "chart") {
          const chart = this.getters.getChart(item.chartId);
          if (!chart) {
            throw new Error(`No chart for the given id: ${item.chartId}`);
          }
          copiedCharts[item.chartId] = chart.copyInSheetId(sheetId);
        }
      }
      figures.push({
        figureId,
        copiedFigure,
        copiedCarousel,
        copiedCharts,
        copiedSheetId: sheetId,
        offset: { x: x - data.topLeft.x, y: y - data.topLeft.y },
      });
    }
    return { figures, figureIds: data.figureIds };
  }

  getPasteTarget(sheetId: UID): ClipboardPasteTarget {
    return { zones: [], figureId: "1", sheetId };
  }

  paste(target: ClipboardPasteTarget, clippedContent: ClipboardContent, options: ClipboardOptions) {
    if (!target.figureId) {
      return;
    }
    const { zones } = target;
    const sheetId = target.sheetId;
    for (const clippedFigure of clippedContent.figures) {
      const figureId = new UuidGenerator().smallUuid();
      const { width, height } = clippedFigure.copiedFigure;
      const maxPosition = this.getters.getMaxAnchorOffset(sheetId, height, width);
      let { left: col, top: row } = zones[0];
      const offset = clippedFigure.offset;
      if (col > maxPosition.col) {
        col = maxPosition.col;
        offset.x = maxPosition.offset.x;
      }
      if (row > maxPosition.row) {
        row = maxPosition.row;
        offset.y = maxPosition.offset.y;
      }
      this.dispatch("CREATE_CAROUSEL", {
        figureId,
        sheetId,
        definition: { items: [] },
        col,
        row,
        offset,
        size: { height, width },
      });

      const uuidGenerator = new UuidGenerator();
      const items = deepCopy(clippedFigure.copiedCarousel.items);
      for (const item of items) {
        if (item.type !== "chart") {
          continue;
        }
        const chart = clippedFigure.copiedCharts[item.chartId];
        const newId = uuidGenerator.smallUuid();
        const definition = chart.copyInSheetId(sheetId).getDefinition();
        this.dispatch("CREATE_CHART", { figureId, chartId: newId, sheetId, definition });
        item.chartId = newId;
      }

      this.dispatch("UPDATE_CAROUSEL", {
        sheetId,
        figureId,
        definition: { ...clippedFigure.copiedCarousel, items },
      });

      if (options.isCutOperation) {
        this.dispatch("DELETE_FIGURE", {
          sheetId: clippedFigure.copiedSheetId,
          figureId: clippedFigure.copiedFigure.id,
        });
      }
      this.dispatch("SELECT_FIGURE", {
        figureId,
        selectMultiple: clippedContent.figureIds.length > 1,
      });
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
