import { ClipboardCellData, ClipboardOptions, ClipboardPasteTarget } from "../types/clipboard";
import { CarouselItem } from "../types/figure";
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
    if (options?.targetCarouselId) {
      const carousel = this.getters.getCarousel(options.targetCarouselId);
      const newItem: CarouselItem = {
        type: "carouselDataView",
        range: this.getters.getRangeFromZone(content.sheetId, content.zones[0]),
      };
      this.dispatch("UPDATE_CAROUSEL", {
        figureId: options.targetCarouselId,
        sheetId: this.getters.getActiveSheetId(),
        definition: this.getters.carouselToCarouselData({
          ...carousel,
          items: [...carousel.items, newItem],
        }),
      });
      this.dispatch("UPDATE_CAROUSEL_ACTIVE_ITEM", {
        figureId: options.targetCarouselId,
        sheetId: this.getters.getActiveSheetId(),
        item: newItem,
      });
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
}
