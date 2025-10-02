import { Component, onWillUpdateProps, useRef } from "@odoo/owl";
import { ActionSpec } from "../../../actions/action";
import { DEFAULT_CAROUSEL_TITLE_STYLE } from "../../../constants";
import { deepEquals } from "../../../helpers";
import { getCarouselItemPreview, getCarouselItemTitle } from "../../../helpers/carousel_helpers";
import { _t } from "../../../translation";
import { CarouselItem, SpreadsheetChildEnv, TitleDesign, UID } from "../../../types";
import { getBoundingRectAsPOJO } from "../../helpers/dom_helpers";
import { useDragAndDropListItems } from "../../helpers/drag_and_drop_dom_items_hook";
import { TextInput } from "../../text_input/text_input";
import { TextStyler } from "../chart/building_blocks/text_styler/text_styler";
import { CogWheelMenu } from "../components/cog_wheel_menu/cog_wheel_menu";
import { Section } from "../components/section/section";

interface Props {
  onCloseSidePanel: () => void;
  figureId: UID;
}

export class CarouselPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-CarouselPanel";
  static props = { onCloseSidePanel: Function, figureId: String };
  static components = { Section, TextInput, TextStyler, CogWheelMenu };

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
      sheetId: this.carouselSheetId,
    });
  }

  get hasDataView(): boolean {
    return this.carouselItems.some((item) => item.type === "carouselDataView");
  }

  isCarouselItemActive(item: CarouselItem): boolean {
    const activeItem = this.env.model.getters.getSelectedCarouselItem(this.props.figureId);
    return deepEquals(activeItem, item);
  }

  addDataViewToCarousel() {
    const carousel = this.env.model.getters.getCarousel(this.props.figureId);
    this.updateItems([...carousel.items, { type: "carouselDataView" }]);
  }

  activateCarouselItem(item: CarouselItem) {
    this.env.model.dispatch("UPDATE_CAROUSEL_ACTIVE_ITEM", {
      figureId: this.props.figureId,
      sheetId: this.carouselSheetId,
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

  popOutCarouselItem(item: CarouselItem) {
    if (item.type !== "chart") return;
    this.env.model.dispatch("POPOUT_CHART_FROM_CAROUSEL", {
      sheetId: this.carouselSheetId,
      carouselId: this.props.figureId,
      chartId: item.chartId,
    });
  }

  duplicateCarouselChart(item: CarouselItem) {
    if (item.type !== "chart") return;
    this.env.model.dispatch("DUPLICATE_CAROUSEL_CHART", {
      sheetId: this.carouselSheetId,
      carouselId: this.props.figureId,
      chartId: item.chartId,
      duplicatedChartId: this.env.model.uuidGenerator.smallUuid(),
    });
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
      sheetId: this.carouselSheetId,
      definition: { ...this.carousel, items },
    });
  }

  updateTitleText(title: string) {
    const carousel = this.env.model.getters.getCarousel(this.props.figureId);
    this.env.model.dispatch("UPDATE_CAROUSEL", {
      figureId: this.props.figureId,
      sheetId: this.carouselSheetId,
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
      sheetId: this.carouselSheetId,
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

  getCogWheelMenuItems(item: CarouselItem): ActionSpec[] {
    const actions: ActionSpec[] = [];
    if (item.type === "chart") {
      actions.push({
        name: _t("Edit chart"),
        execute: () => this.editCarouselItem(item),
        icon: "o-spreadsheet-Icon.EDIT",
      });
      actions.push({
        name: _t("Pop out chart"),
        execute: () => this.popOutCarouselItem(item),
        icon: "o-spreadsheet-Icon.EXTERNAL",
      });
      actions.push({
        name: _t("Duplicate chart"),
        execute: () => this.duplicateCarouselChart(item),
        icon: "o-spreadsheet-Icon.COPY",
      });
    }
    actions.push({
      name: _t("Delete item"),
      execute: () => this.deleteCarouselItem(item),
      icon: "o-spreadsheet-Icon.TRASH",
    });
    return actions;
  }

  get carouselSheetId(): UID {
    const sheetId = this.env.model.getters.getFigureSheetId(this.props.figureId);
    if (!sheetId) {
      throw new Error("Could not find the sheetId of the carousel figure");
    }
    return sheetId;
  }

  get carouselDataViewMessage(): string {
    return _t("The data view makes the carousel transparent, revealing the data underneath.");
  }
}
