import { UuidGenerator } from "../helpers/uuid";
import { ClipboardCellData, ClipboardOptions, ClipboardPasteTarget } from "../types/clipboard";
import { Carousel, CarouselItem } from "../types/figure";
import { UID, Zone } from "../types/misc";
import { AbstractCellClipboardHandler } from "./abstract_cell_clipboard_handler";

interface ClipboardContent {
  zones: Zone[];
  sheetId: UID;
}

export class ReferenceClipboardHandler extends AbstractCellClipboardHandler<ClipboardContent, {}> {
  get canPasteInCarousel() {
    return true;
  }

  copy(data: ClipboardCellData): ClipboardContent | undefined {
    return {
      zones: data.clippedZones,
      sheetId: data.sheetId,
    };
  }

  paste(target: ClipboardPasteTarget, content: ClipboardContent, options: ClipboardOptions) {
    if (options.targetFigureId) {
      this.pasteInCarousel(options.targetFigureId, content);
      return;
    }
    if (options.isCutOperation) {
      const selection = target.zones[0];
      this.dispatch("MOVE_RANGES", {
        target: content.zones,
        sheetId: content.sheetId,
        sheetName: this.getters.getSheetName(content.sheetId),
        targetSheetId: target.sheetId,
        col: selection.left,
        row: selection.top,
      });
    }
  }

  private pasteInCarousel(targetFigureId: UID, content: ClipboardContent) {
    const sheetId = this.getters.getActiveSheetId();
    const targetFigure = this.getters.getFigure(sheetId, targetFigureId);
    let figureId: UID;
    switch (targetFigure?.tag) {
      case "carousel":
        figureId = targetFigureId;
        break;
      case "chart": {
        const chartId = this.getters.getChartIdFromFigureId(targetFigureId);
        if (!chartId) {
          throw new Error(`No chart for the given figure id: ${targetFigureId}`);
        }
        this.dispatch("MERGE_CHART_FIGURES_INTO_CAROUSEL", {
          sheetId,
          baseFigureId: targetFigureId,
          chartFigureIds: [targetFigureId],
          newCarouselId: UuidGenerator.smallUuid(),
        });
        figureId = this.getters.getFigureIdFromChartId(chartId);
        break;
      }
      default:
        throw new Error(`Cannot paste into figure of type ${targetFigure?.tag}`);
    }
    const carousel: Carousel = this.getters.getCarousel(figureId);
    const newItem: CarouselItem = {
      type: "carouselDataView",
      range: this.getters.getRangeFromZone(content.sheetId, content.zones[0]),
    };
    this.dispatch("UPDATE_CAROUSEL", {
      figureId,
      sheetId,
      definition: this.getters.carouselToCarouselData({
        ...carousel,
        items: [...carousel.items, newItem],
      }),
    });
    this.dispatch("UPDATE_CAROUSEL_ACTIVE_ITEM", {
      carouselId: figureId,
      sheetId,
      itemIndex: carousel.items.length,
    });
    this.dispatch("SELECT_FIGURE", { figureId });
  }
}
