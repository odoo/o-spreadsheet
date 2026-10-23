import { UuidGenerator } from "../helpers/uuid";
import {
  ClipboardCellData,
  ClipboardOptions,
  ClipboardPasteTarget,
  ClipboardPositions,
} from "../types/clipboard";
import { Carousel, CarouselItem } from "../types/figure";
import { UID, Zone } from "../types/misc";
import { ClipboardHandler } from "./abstract_clipboard_handler";

export class ZoneClipboardHandler extends ClipboardHandler<Zone[]> {
  get canPasteInFigure() {
    return true;
  }

  copy(data: ClipboardCellData): Zone[] | undefined {
    return data.clippedZones;
  }

  paste(
    target: ClipboardPasteTarget,
    content: Zone[],
    options: ClipboardOptions,
    positions: ClipboardPositions
  ) {
    const sheetId = positions.sheetId;
    if (options.targetFigureId) {
      this.pasteInCarousel(options.targetFigureId, content[0], sheetId);
      return;
    }
    if (options.isCutOperation && sheetId) {
      const selection = target.zones[0];
      this.dispatch("MOVE_RANGES", {
        target: content,
        sheetId,
        sheetName: this.getters.getSheetName(sheetId),
        targetSheetId: target.sheetId,
        col: selection.left,
        row: selection.top,
      });
    }
  }

  private pasteInCarousel(targetFigureId: UID, zone: Zone, originSheetId: UID) {
    const targetSheetId = this.getters.getActiveSheetId();
    const targetFigure = this.getters.getFigure(targetSheetId, targetFigureId);
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
          sheetId: targetSheetId,
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
      range: this.getters.getRangeFromZone(originSheetId, zone),
    };
    this.dispatch("UPDATE_CAROUSEL", {
      figureId,
      sheetId: targetSheetId,
      definition: this.getters.carouselToCarouselData({
        ...carousel,
        items: [...carousel.items, newItem],
      }),
    });
    this.dispatch("UPDATE_CAROUSEL_ACTIVE_ITEM", {
      carouselId: figureId,
      sheetId: targetSheetId,
      itemIndex: carousel.items.length,
    });
    this.dispatch("SELECT_FIGURE", { figureId });
  }
}
