import { Component, onWillUpdateProps, useRef } from "@odoo/owl";
import { DEFAULT_CAROUSEL_TITLE_STYLE } from "../../../constants";
import { deepEquals } from "../../../helpers";
import { getCarouselItemPreview, getCarouselItemTitle } from "../../../helpers/carousel_helpers";
import { _t } from "../../../translation";
import { CarouselItem, SpreadsheetChildEnv, TitleDesign, UID } from "../../../types";
import { getBoundingRectAsPOJO } from "../../helpers/dom_helpers";
import { useDragAndDropListItems } from "../../helpers/drag_and_drop_dom_items_hook";
import { TextInput } from "../../text_input/text_input";
import { TextStyler } from "../chart/building_blocks/text_styler/text_styler";
import { Section } from "../components/section/section";

interface Props {
  onCloseSidePanel: () => void;
  figureId: UID;
}

export class CarouselPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-CarouselPanel";
  static props = { onCloseSidePanel: Function, figureId: String };
  static components = { Section, TextInput, TextStyler };

  DEFAULT_CAROUSEL_TITLE_STYLE = DEFAULT_CAROUSEL_TITLE_STYLE;

  private dragAndDrop = useDragAndDropListItems();
  private previewListRef = useRef("previewList");

  setup() {
    let lastCarouselItems: CarouselItem[] = [...this.carouselItems];
    onWillUpdateProps(() => {
      if (!deepEquals(this.carouselItems, lastCarouselItems)) {
        this.dragAndDrop.cancel();
      }
      lastCarouselItems = [...this.carouselItems];
    });
  }

  get carouselItems(): CarouselItem[] {
    return this.env.model.getters.getCarousel(this.props.figureId).items;
  }

  get title(): TitleDesign | undefined {
    return this.env.model.getters.getCarousel(this.props.figureId).title;
  }

  get carousel() {
    return this.env.model.getters.getCarousel(this.props.figureId);
  }

  getPreviewDivStyle(item: CarouselItem): string {
    return this.dragAndDrop.itemsStyle[this.getItemId(item)] || "";
  }

  getItemId(item: CarouselItem): string {
    return item.type === "chart" ? item.chartId : "transparent-carousel";
  }

  addNewChartToCarousel() {
    this.env.model.dispatch("ADD_NEW_CHART_TO_CAROUSEL", {
      figureId: this.props.figureId,
      sheetId: this.env.model.getters.getActiveSheetId(),
    });
  }

  get hasDataView(): boolean {
    return this.carouselItems.some((item) => item.type === "carouselDataView");
  }

  addDataViewToCarousel() {
    const carousel = this.env.model.getters.getCarousel(this.props.figureId);
    this.updateItems([...carousel.items, { type: "carouselDataView" }]);
  }

  activateCarouselItem(item: CarouselItem) {
    this.env.model.dispatch("UPDATE_CAROUSEL_ACTIVE_ITEM", {
      figureId: this.props.figureId,
      sheetId: this.env.model.getters.getActiveSheetId(),
      item,
    });
  }

  editCarouselItem(item: CarouselItem) {
    if (item.type === "chart") {
      this.activateCarouselItem(item);
      this.env.model.dispatch("SELECT_FIGURE", { figureId: this.props.figureId });
      this.env.openSidePanel("ChartPanel", { chartId: item.chartId });
    }
  }

  renameCarouselItem(item: CarouselItem, newName: string) {
    const trimmedName = newName.trim();
    if (!trimmedName || trimmedName === this.getItemTitle(item).toString()) {
      return;
    }
    const items = [...this.carouselItems];
    const itemIndex = this.carouselItems.findIndex((itm) => deepEquals(itm, item));
    if (itemIndex !== -1) {
      items[itemIndex] = { ...item, title: trimmedName };
      this.updateItems(items);
    }
  }

  deleteCarouselItem(item: CarouselItem) {
    const carousel = this.env.model.getters.getCarousel(this.props.figureId);
    const items = carousel.items.filter((itm) => !deepEquals(itm, item));
    this.updateItems(items);
  }

  onDragHandleMouseDown(item: CarouselItem, event: MouseEvent) {
    if (event.button !== 0) return;
    const previewRects = Array.from(this.previewListRef.el!.children).map((previewEl) =>
      getBoundingRectAsPOJO(previewEl)
    );
    const items = this.carouselItems.map((item, index) => ({
      id: this.getItemId(item),
      size: previewRects[index].height,
      position: previewRects[index].y,
    }));
    this.dragAndDrop.start("vertical", {
      draggedItemId: this.getItemId(item),
      initialMousePosition: event.clientY,
      items: items,
      scrollableContainerEl: this.previewListRef.el!,
      onDragEnd: (itemId: string, finalIndex: number) => this.onDragEnd(item, finalIndex),
    });
  }

  private onDragEnd(item: CarouselItem, finalIndex: number) {
    const originalIndex = this.carouselItems.findIndex((itm) => deepEquals(itm, item));
    if (originalIndex === -1 || originalIndex === finalIndex) {
      return;
    }
    const carousel = this.env.model.getters.getCarousel(this.props.figureId);
    const items = [...carousel.items];
    items.splice(originalIndex, 1);
    items.splice(finalIndex, 0, item);
    this.updateItems(items);
  }

  getItemTitle(item: CarouselItem): string {
    return getCarouselItemTitle(this.env.model.getters, item);
  }

  getItemPreview(item: CarouselItem): string {
    return getCarouselItemPreview(this.env.model.getters, item);
  }

  updateItems(items: CarouselItem[]) {
    this.env.model.dispatch("UPDATE_CAROUSEL", {
      figureId: this.props.figureId,
      sheetId: this.env.model.getters.getActiveSheetId(),
      definition: { ...this.carousel, items },
    });
  }

  updateTitleText(title: string) {
    const carousel = this.env.model.getters.getCarousel(this.props.figureId);
    this.env.model.dispatch("UPDATE_CAROUSEL", {
      figureId: this.props.figureId,
      sheetId: this.env.model.getters.getActiveSheetId(),
      definition: {
        ...carousel,
        title: {
          ...carousel.title,
          text: title,
        },
      },
    });
  }

  updateTitleStyle(style: TitleDesign) {
    const carousel = this.env.model.getters.getCarousel(this.props.figureId);
    this.env.model.dispatch("UPDATE_CAROUSEL", {
      figureId: this.props.figureId,
      sheetId: this.env.model.getters.getActiveSheetId(),
      definition: {
        ...carousel,
        title: {
          ...carousel.title,
          ...style,
        },
      },
    });
  }

  get carouselAddChartInfoMessage(): string {
    return _t(
      "Add a chart to the carousel. You can also add a chart by dragging and dropping it over the carousel figure."
    );
  }
}
