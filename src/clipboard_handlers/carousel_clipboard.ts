import { AbstractFigureClipboardHandler } from "@odoo/o-spreadsheet-engine/clipboard_handlers/abstract_figure_clipboard_handler";
import { MyChart } from "@odoo/o-spreadsheet-engine/helpers/figures/chart";
import { deepCopy, UuidGenerator } from "../helpers";
import {
  Carousel,
  ClipboardFigureData,
  ClipboardOptions,
  ClipboardPasteTarget,
  CommandResult,
  Figure,
  UID,
  Zone,
} from "../types";

type ClipboardContent = {
  figureId: UID;
  copiedSheetId: UID;
  copiedFigure: Figure;
  copiedCarousel: Carousel;
  copiedCharts: { [chartId: UID]: MyChart };
};

export class CarouselClipboardHandler extends AbstractFigureClipboardHandler<ClipboardContent> {
  copy(data: ClipboardFigureData): ClipboardContent | undefined {
    const sheetId = data.sheetId;
    const figure = this.getters.getFigure(sheetId, data.figureId);
    if (!figure) {
      throw new Error(`No figure for the given id: ${data.figureId}`);
    }
    if (figure.tag !== "carousel") {
      return;
    }
    const copiedFigure = { ...figure };
    const copiedCarousel = this.getters.getCarousel(data.figureId);
    const copiedCharts: { [chartId: UID]: MyChart } = {};
    for (const item of copiedCarousel.items) {
      if (item.type === "chart") {
        const chart = this.getters.getChart(item.chartId);
        if (!chart) {
          throw new Error(`No chart for the given id: ${item.chartId}`);
        }
        copiedCharts[item.chartId] = chart;
      }
    }
    return {
      figureId: data.figureId,
      copiedFigure,
      copiedCarousel,
      copiedCharts,
      copiedSheetId: sheetId,
    };
  }

  getPasteTarget(sheetId: UID): ClipboardPasteTarget {
    const newId = new UuidGenerator().smallUuid();
    return { zones: [], figureId: newId, sheetId };
  }

  paste(target: ClipboardPasteTarget, clippedContent: ClipboardContent, options: ClipboardOptions) {
    if (!target.figureId) {
      return;
    }
    const { zones, figureId } = target;
    const sheetId = target.sheetId;
    const { width, height } = clippedContent.copiedFigure;
    const maxPosition = this.getters.getMaxAnchorOffset(sheetId, height, width);
    let { left: col, top: row } = zones[0];
    const offset = { x: 0, y: 0 };
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
    const items = deepCopy(clippedContent.copiedCarousel.items);
    for (const item of items) {
      if (item.type !== "chart") {
        continue;
      }
      const chart = clippedContent.copiedCharts[item.chartId];
      const newId = uuidGenerator.smallUuid();
      const definition = MyChart.fromDefinition(
        this.getters,
        sheetId,
        chart.copyInSheetId(sheetId)
      ).getDefinition();
      this.dispatch("CREATE_CHART", { figureId, chartId: newId, sheetId, definition });
      item.chartId = newId;
    }

    this.dispatch("UPDATE_CAROUSEL", {
      sheetId,
      figureId,
      definition: { ...clippedContent.copiedCarousel, items },
    });

    if (options.isCutOperation) {
      this.dispatch("DELETE_FIGURE", {
        sheetId: clippedContent.copiedSheetId,
        figureId: clippedContent.copiedFigure.id,
      });
    }
    this.dispatch("SELECT_FIGURE", { figureId });
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
