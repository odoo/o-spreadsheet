import { Component, onWillUpdateProps, useRef } from "@odoo/owl";
import { ActionSpec } from "../../../actions/action";
import { DEFAULT_CAROUSEL_TITLE_STYLE } from "../../../constants";
import { getCarouselItemPreview, getCarouselItemTitle } from "../../../helpers/carousel_helpers";
import { deepEquals, getCanonicalSymbolName } from "../../../helpers/misc";
import { UuidGenerator } from "../../../helpers/uuid";
import { zoneToXc } from "../../../helpers/zones";
import { _t } from "../../../translation";
import { TitleDesign } from "../../../types/chart/chart";
import { CarouselItem } from "../../../types/figure";
import { UID } from "../../../types/misc";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { getBoundingRectAsPOJO } from "../../helpers/dom_helpers";
import { useDragAndDropListItems } from "../../helpers/drag_and_drop_dom_items_hook";
import { SelectionInput } from "../../selection_input/selection_input";
import { TextInput } from "../../text_input/text_input";
import { TextStyler } from "../chart/building_blocks/text_styler/text_styler";
import { CogWheelMenu } from "../components/cog_wheel_menu/cog_wheel_menu";
import { Section } from "../components/section/section";

type DataLayerCarouselItem = CarouselItem & { type: "dataLayer" };

interface Props {
  onCloseSidePanel: () => void;
  figureId: UID;
}

export class CarouselPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-CarouselPanel";
  static props = { onCloseSidePanel: Function, figureId: String };
  static components = { Section, TextInput, TextStyler, CogWheelMenu, SelectionInput };

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
    return item.id;
  }

  addNewChartToCarousel() {
    this.env.model.dispatch("ADD_NEW_CHART_TO_CAROUSEL", {
      figureId: this.props.figureId,
      sheetId: this.carouselSheetId,
    });
  }

  get showDataView(): boolean {
    return this.carousel.showDataView === true;
  }

  toggleShowDataView() {
    this.env.model.dispatch("UPDATE_CAROUSEL", {
      figureId: this.props.figureId,
      sheetId: this.carouselSheetId,
      definition: { ...this.carousel, showDataView: !this.showDataView },
    });
  }

  isCarouselItemActive(item: CarouselItem): boolean {
    const activeItem = this.env.model.getters.getSelectedCarouselItem(this.props.figureId);
    return deepEquals(activeItem, item);
  }

  addDataLayerToCarousel(rangeXc: string) {
    const carousel = this.env.model.getters.getCarousel(this.props.figureId);
    const sheetId = this.env.model.getters.getActiveSheetId();
    const dataLayerId = UuidGenerator.smallUuid();
    const carouselSheetId = this.carouselSheetId;
    const fig = this.env.model.getters.getFigure(carouselSheetId, this.props.figureId)!;
    this.env.model.dispatch("CREATE_DATA_LAYER", {
      dataLayerId,
      figureId: this.props.figureId,
      sheetId: carouselSheetId,
      col: fig.col,
      row: fig.row,
      offset: fig.offset,
      size: { width: fig.width, height: fig.height },
      definition: { rangeXc, sheetId },
    });
    this.updateItems([...carousel.items, { type: "dataLayer", id: dataLayerId }]);
  }

  onAddDataLayer() {
    const zone = this.env.model.getters.getSelectedZone();
    const rangeXc = zoneToXc(zone);
    this.addDataLayerToCarousel(rangeXc);
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
      this.env.openSidePanel("ChartPanel", { chartId: item.id });
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
    if (item.type !== "chart") {
      return;
    }
    this.env.model.dispatch("POPOUT_CHART_FROM_CAROUSEL", {
      sheetId: this.carouselSheetId,
      carouselId: this.props.figureId,
      chartId: item.id,
    });
  }

  duplicateCarouselChart(item: CarouselItem) {
    if (item.type !== "chart") {
      return;
    }
    this.env.model.dispatch("DUPLICATE_CAROUSEL_CHART", {
      sheetId: this.carouselSheetId,
      carouselId: this.props.figureId,
      chartId: item.id,
      duplicatedChartId: UuidGenerator.smallUuid(),
    });
  }

  onDragHandleMouseDown(item: CarouselItem, event: MouseEvent) {
    if (event.button !== 0) {
      return;
    }
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

  get layout(): "tabs" | "row" | "grid" {
    return this.carousel.layout || "tabs";
  }

  setLayout(layout: "tabs" | "row" | "grid") {
    const definition = { ...this.carousel, layout };
    if (layout === "grid" && !this.carousel.columns) {
      definition.columns = 2;
    }
    this.env.model.dispatch("UPDATE_CAROUSEL", {
      figureId: this.props.figureId,
      sheetId: this.carouselSheetId,
      definition,
    });
  }

  get gridColumns(): number {
    return this.carousel.columns ?? 2;
  }

  setGridColumns(columns: number) {
    const clamped = Math.max(1, Math.min(columns, 12));
    this.env.model.dispatch("UPDATE_CAROUSEL", {
      figureId: this.props.figureId,
      sheetId: this.carouselSheetId,
      definition: { ...this.carousel, columns: clamped },
    });
  }

  setItemColSpan(item: CarouselItem, colSpan: number) {
    const items = [...this.carouselItems];
    const index = items.findIndex((itm) => itm.id === item.id);
    if (index !== -1) {
      items[index] = { ...item, colSpan: Math.max(1, colSpan) };
      this.updateItems(items);
    }
  }

  setItemRowSpan(item: CarouselItem, rowSpan: number) {
    const items = [...this.carouselItems];
    const index = items.findIndex((itm) => itm.id === item.id);
    if (index !== -1) {
      items[index] = { ...item, rowSpan: Math.max(1, rowSpan) };
      this.updateItems(items);
    }
  }

  get carouselDataViewMessage(): string {
    return _t("The data view makes the carousel transparent, revealing the data underneath.");
  }

  get activeDataLayerItem(): DataLayerCarouselItem | undefined {
    const activeItem = this.env.model.getters.getSelectedCarouselItem(this.props.figureId);
    return activeItem?.type === "dataLayer" ? (activeItem as DataLayerCarouselItem) : undefined;
  }

  getDataLayerRangeString(item: DataLayerCarouselItem): string {
    const def = this.env.model.getters.getDataLayer(item.id);
    const sheetName = this.env.model.getters.getSheetName(def.sheetId);
    return `${getCanonicalSymbolName(sheetName)}!${def.rangeXc}`;
  }

  private pendingDataLayerRange: string | undefined;

  onDataLayerRangeChanged(ranges: string[]) {
    this.pendingDataLayerRange = ranges[0];
  }

  onDataLayerRangeConfirmed() {
    const activeItem = this.activeDataLayerItem;
    if (!activeItem || !this.pendingDataLayerRange) {
      return;
    }
    const currentDef = this.env.model.getters.getDataLayer(activeItem.id);
    const range = this.env.model.getters.getRangeFromSheetXC(
      currentDef.sheetId,
      this.pendingDataLayerRange
    );
    const newRangeXc = zoneToXc(range.zone);

    this.env.model.dispatch("UPDATE_DATA_LAYER", {
      dataLayerId: activeItem.id,
      sheetId: this.carouselSheetId,
      definition: { rangeXc: newRangeXc, sheetId: range.sheetId },
    });
    this.pendingDataLayerRange = undefined;
  }
}
