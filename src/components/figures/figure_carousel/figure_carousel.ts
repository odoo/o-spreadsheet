import { _t, GridRenderingContext, UID, Zone } from "@odoo/o-spreadsheet-engine";
import { DEFAULT_CAROUSEL_TITLE_STYLE } from "@odoo/o-spreadsheet-engine/constants";
import { getCarouselItemTitle } from "@odoo/o-spreadsheet-engine/helpers/carousel_helpers";
import { ViewportCollection } from "@odoo/o-spreadsheet-engine/helpers/viewport_collection";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useEffect, useRef, useState } from "@odoo/owl";
import { ActionSpec, createActions } from "../../../actions/action";
import { chartStyleToCellStyle, deepEquals } from "../../../helpers";
import { chartComponentRegistry } from "../../../registries/chart_component_registry";
import { Store, useStore } from "../../../store_engine";
import {
  Carousel,
  CarouselItem,
  CSSProperties,
  FigureUI,
  MenuMouseEvent,
  Range,
  Rect,
} from "../../../types";
import { FullScreenFigureStore } from "../../full_screen_figure/full_screen_figure_store";
import { cellTextStyleToCss, cssPropertiesToCss } from "../../helpers";
import { getBoundingRectAsPOJO, getRefBoundingRect } from "../../helpers/dom_helpers";
import { MenuPopover, MenuState } from "../../menu_popover/menu_popover";
import { StandaloneGridCanvas } from "../../standalone_grid_canvas/standalone_grid_canvas";
import { ChartAnimationStore } from "../chart/chartJs/chartjs_animation_store";
import { ChartDashboardMenu } from "../chart/chart_dashboard_menu/chart_dashboard_menu";

interface Props {
  figureUI: FigureUI;
  editFigureStyle?: (properties: CSSProperties) => void;
  isFullScreen?: boolean;
  openContextMenu?: (anchorRect: Rect, onClose?: () => void) => void;
}

export class CarouselFigure extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-CarouselFigure";
  static props = {
    figureUI: Object,
    editFigureStyle: { type: Function, optional: true },
    isFullScreen: { type: Boolean, optional: true },
    openContextMenu: { type: Function, optional: true },
  };
  static components = { ChartDashboardMenu, MenuPopover, StandaloneGridCanvas };

  private carouselTabsRef = useRef("carouselTabs");
  private carouselTabsDropdownRef = useRef("carouselTabsDropdown");

  private menuState = useState<MenuState>({ isOpen: false, anchorRect: null, menuItems: [] });
  private hiddenItems: CarouselItem[] = [];

  protected animationStore: Store<ChartAnimationStore> | undefined;
  private fullScreenFigureStore!: Store<FullScreenFigureStore>;

  setup(): void {
    this.animationStore = useStore(ChartAnimationStore);
    this.fullScreenFigureStore = useStore(FullScreenFigureStore);

    useEffect(() => {
      if (this.selectedCarouselItem?.type === "carouselDataView") {
        this.props.editFigureStyle?.({ "pointer-events": "none" });
      } else {
        this.props.editFigureStyle?.({ "pointer-events": "auto" });
      }
      this.updateTabsVisibility();
    });
  }

  get carousel(): Carousel {
    return this.env.model.getters.getCarousel(this.props.figureUI.id);
  }

  get selectedCarouselItem(): CarouselItem | undefined {
    return this.env.model.getters.getSelectedCarouselItem(this.props.figureUI.id);
  }

  get chartComponent(): new (...args: any) => Component {
    const selectedItem = this.selectedCarouselItem;
    if (selectedItem?.type !== "chart") {
      throw new Error("Selected item is not a chart");
    }
    const type = this.env.model.getters.getChartType(selectedItem.chartId);
    const component = chartComponentRegistry.get(type);
    if (!component) {
      throw new Error(`Component is not defined for type ${type}`);
    }
    return component;
  }

  onCarouselDoubleClick() {
    this.env.model.dispatch("SELECT_FIGURE", { figureId: this.props.figureUI.id });
    this.env.openSidePanel("CarouselPanel", { figureId: this.props.figureUI.id });
  }

  isItemSelected(item: CarouselItem): boolean {
    const selectedItem = this.selectedCarouselItem;
    return deepEquals(selectedItem, item);
  }

  getItemTitle(item: CarouselItem): string {
    return getCarouselItemTitle(this.env.model.getters, item);
  }

  onCarouselTabClick(item: CarouselItem) {
    this.env.model.dispatch("UPDATE_CAROUSEL_ACTIVE_ITEM", {
      figureId: this.props.figureUI.id,
      sheetId: this.env.model.getters.getActiveSheetId(),
      item,
    });
    if (item.type === "chart") {
      const animationChartId = item.chartId + (this.props.isFullScreen ? "-fullscreen" : "");
      this.animationStore?.enableAnimationForChart(animationChartId);
    }
  }

  get headerStyle(): string {
    const cssProperties: CSSProperties = {};
    if (this.selectedCarouselItem?.type === "chart") {
      const chart = this.env.model.getters.getChartRuntime(this.selectedCarouselItem.chartId);
      cssProperties["background-color"] = chart.background;
    } else {
      cssProperties["background-color"] = "#ffffff";
    }
    return cssPropertiesToCss(cssProperties);
  }

  get title(): string {
    return this.carousel.title?.text ?? "";
  }

  get titleStyle(): string {
    const style = { ...DEFAULT_CAROUSEL_TITLE_STYLE, ...this.carousel.title };
    return cssPropertiesToCss(cellTextStyleToCss(chartStyleToCellStyle(style)));
  }

  private updateTabsVisibility(): void {
    const tabsContainerEl = this.carouselTabsRef.el;
    const dropDownEl = this.carouselTabsDropdownRef.el;
    if (!tabsContainerEl || !dropDownEl) {
      return;
    }

    this.hiddenItems = [];

    const containerRect = getBoundingRectAsPOJO(tabsContainerEl);
    const tabs = Array.from(tabsContainerEl.children) as HTMLElement[];

    for (const tab of tabs) {
      tab.style.display = "block";
    }

    const tabWidths = tabs.map((tab) => getBoundingRectAsPOJO(tab).width);

    let currentWidth = 0;
    for (let i = 0; i < tabs.length; i++) {
      const shouldBeHidden = currentWidth + tabWidths[i] > containerRect.width;
      currentWidth += tabWidths[i];
      if (shouldBeHidden) {
        tabs[i].style.display = "none";
        this.hiddenItems.push(this.carousel.items[i]);
      }
    }

    dropDownEl.style.display = this.hiddenItems.length ? "block" : "none";
  }

  get menuId() {
    return "carousel-tabs-menu-";
  }

  toggleMenu(ev: MenuMouseEvent) {
    if (ev.closedMenuId === this.menuId) {
      this.menuState.isOpen = false;
      return;
    }
    const rect = getRefBoundingRect(this.carouselTabsDropdownRef);
    const menuItems: ActionSpec[] = this.hiddenItems.map((item) => ({
      name: this.getItemTitle(item),
      execute: () => this.onCarouselTabClick(item),
      isActive: () => this.isItemSelected(item),
      isReadonlyAllowed: true,
    }));
    this.menuState.isOpen = true;
    this.menuState.anchorRect = rect;
    this.menuState.menuItems = createActions(menuItems);
  }

  toggleFullScreen() {
    if (this.selectedCarouselItem?.type === "chart") {
      this.fullScreenFigureStore.toggleFullScreenFigure(this.props.figureUI.id);
    }
  }

  get fullScreenButtonTitle(): string {
    return this.props.isFullScreen ? _t("Exit Full Screen") : _t("Full Screen");
  }

  get visibleCarouselItems(): CarouselItem[] {
    return this.carousel.items.filter((item) =>
      item.type === "carouselDataView" && this.props.isFullScreen ? false : true
    );
  }

  openContextMenu(event: MouseEvent) {
    const target = event.currentTarget as HTMLElement;
    if (target) {
      this.props.openContextMenu?.(getBoundingRectAsPOJO(target));
    }
  }

  get carouselRangeProps(): StandaloneGridCanvas["props"] {
    const item = this.selectedCarouselItem;
    if (!item || item.type !== "dataRange") {
      throw new Error("Selected carousel item is not a data range");
    }
    const range = this.env.model.getters.getRangeFromSheetXC(
      this.env.model.getters.getActiveSheetId(),
      item.range
    );
    return {
      sheetId: range.sheetId,
      zone: range.zone,
      renderingCtx: {
        hideGridLines: this.env.model.getters.isDashboard(),
        ...this.getZoneRenderingContext(range.sheetId, range.zone, this.getZoom(range)),
      },
    };
  }

  // ADRM TODO: this should probably be in StandaloneGridCanvas ?
  private getZoneRenderingContext(
    sheetId: UID,
    zone: Zone,
    zoom: number
  ): Partial<GridRenderingContext> {
    const firstRowStart = this.env.model.getters.getRowDimensions(sheetId, zone.top).start;
    const lastRowEnd = this.env.model.getters.getRowDimensions(sheetId, zone.bottom).end;
    const firstColStart = this.env.model.getters.getColDimensions(sheetId, zone.left).start;
    const lastColEnd = this.env.model.getters.getColDimensions(sheetId, zone.right).end;

    const viewports = new ViewportCollection(this.env.model.getters);
    viewports.sheetViewWidth = lastColEnd - firstColStart;
    viewports.sheetViewHeight = lastRowEnd - firstRowStart;
    viewports.setSheetViewOffset(sheetId, firstColStart, firstRowStart);
    viewports.zoomLevel = zoom;

    return {
      selectedZones: [],
      sheetId,
      viewports,
    };
  }

  onMouseWheel(ev: WheelEvent) {
    const el = ev.currentTarget as HTMLElement;
    if (!el) {
      return;
    }
    // check if el is scrollable in the direction of the wheel event
    const deltaY = ev.deltaY;
    const deltaX = ev.deltaX;
    const isScrollableY = deltaY ? el.scrollHeight !== el.clientHeight : false;
    const isScrollableX = deltaX ? el.scrollWidth !== el.clientWidth : false;

    if (isScrollableY || isScrollableX) {
      ev.stopPropagation(); // Prevent the event to bubble to the grid
    }
  }

  private getZoom(range: Range) {
    const item = this.selectedCarouselItem;
    if (!item || item.type !== "dataRange") {
      throw new Error("Selected carousel item is not a data range");
    }
    const { sheetId, zone } = range;

    if (item.scale === "fitToWidth") {
      const startX = this.env.model.getters.getColDimensions(sheetId, zone.left).start;
      const endX = this.env.model.getters.getColDimensions(sheetId, zone.right).end;
      const width = endX - startX;
      return (this.props.figureUI.width - 15) / width; // ADRM TODO: scrollbar messes up everything, so I remove 30 ...
    } else if (item.scale === "fitToHeight") {
      const startY = this.env.model.getters.getRowDimensions(sheetId, zone.top).start;
      const endY = this.env.model.getters.getRowDimensions(sheetId, zone.bottom).end;
      const height = endY - startY;
      return (this.props.figureUI.height - 45) / height; // ADRM TODO: real carousel content height + scrollbar
    }
    return 1;
  }
}
