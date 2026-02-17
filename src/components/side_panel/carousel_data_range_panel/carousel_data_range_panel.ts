import { UID } from "@odoo/o-spreadsheet-engine";
import { RangeCarouselItem } from "@odoo/o-spreadsheet-engine/types/figure";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useState } from "@odoo/owl";
import { SelectionInput } from "../../selection_input/selection_input";
import { Section } from "../components/section/section";

interface Props {
  onCloseSidePanel: () => void;
  carouselId: UID;
}

interface State {
  range: string;
}

export class CarouselDataRangePanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-CarouselDataRangePanel";
  static components = {
    Section,
    SelectionInput,
  };
  static props = { "*": Object }; // ADRM TODO

  state = useState<State>({ range: this.carouselItem.range });

  get carouselItem(): RangeCarouselItem {
    const item = this.env.model.getters.getSelectedCarouselItem(this.props.carouselId);
    if (!item || item.type !== "dataRange") {
      throw new Error("Selected carousel item is not a data range");
    }
    return item;
  }

  onRangeChange(newRanges: string[]) {
    this.state.range = newRanges[0];
  }

  onRangeConfirm() {
    this.updateCarouselItem({ range: this.state.range });
  }

  updateCarouselItem(update: Partial<RangeCarouselItem>) {
    const carousel = this.env.model.getters.getCarousel(this.props.carouselId);
    const selectedItem = this.carouselItem;
    const editedItemIndex = carousel.items.findIndex((item) => item === selectedItem);
    const updatedItems = [...carousel.items];
    updatedItems[editedItemIndex] = { ...selectedItem, ...update };
    this.env.model.dispatch("UPDATE_CAROUSEL", {
      sheetId: this.carouselSheetId,
      figureId: this.props.carouselId,
      definition: { ...carousel, items: updatedItems },
    });
  }

  get carouselSheetId(): UID {
    const sheetId = this.env.model.getters.getFigureSheetId(this.props.carouselId);
    if (!sheetId) {
      throw new Error("Carousel figure does not have a sheet");
    }
    return sheetId;
  }
}
