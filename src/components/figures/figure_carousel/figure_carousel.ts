import { Component, useEffect, useRef, useState } from "@odoo/owl";
import { ActionSpec, createActions } from "../../../actions/action";
import { DEFAULT_CAROUSEL_TITLE_STYLE } from "../../../constants";
import { getCarouselItemTitle } from "../../../helpers/carousel_helpers";
import { chartStyleToCellStyle, deepEquals } from "../../../helpers/misc";
import { toZone } from "../../../helpers/zones";
import { clickableCellRegistry } from "../../../registries/cell_clickable_registry";
import { chartComponentRegistry } from "../../../registries/chart_component_registry";
import { useStore } from "../../../store_engine/store_hooks";
import {
  DataLayerRenderer,
  getDataLayerCellPosition,
} from "../../../stores/data_layer_renderer_store";
import { _t } from "../../../translation";
import { Carousel, CarouselItem, FigureUI } from "../../../types/figure";
import { CellPosition, CSSProperties, MenuMouseEvent } from "../../../types/misc";
import { Rect } from "../../../types/rendering";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Store } from "../../../types/store_engine";
import { FilterMenu } from "../../filters/filter_menu/filter_menu";
import { FullScreenFigureStore } from "../../full_screen_figure/full_screen_figure_store";
import { cellTextStyleToCss, cssPropertiesToCss } from "../../helpers/css";
import { getBoundingRectAsPOJO, getRefBoundingRect } from "../../helpers/dom_helpers";
import { MenuPopover, MenuState } from "../../menu_popover/menu_popover";
import { Popover } from "../../popover/popover";
import { HoveredTableStore } from "../../tables/hovered_table_store";
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
  static components = { ChartDashboardMenu, MenuPopover, FilterMenu, Popover };

  private carouselTabsRef = useRef("carouselTabs");
  private carouselTabsDropdownRef = useRef("carouselTabsDropdown");
  private dataLayerCanvasRef = useRef("dataLayerCanvas");

  private menuState = useState<MenuState>({ isOpen: false, anchorRect: null, menuItems: [] });
  private filterPopover = useState<{
    isOpen: boolean;
    anchorRect: Rect;
    filterPosition: { col: number; row: number };
    sheetId?: string;
  }>({
    isOpen: false,
    anchorRect: { x: 0, y: 0, width: 0, height: 0 },
    filterPosition: { col: 0, row: 0 },
  });
  private hiddenItems: CarouselItem[] = [];

  protected animationStore: Store<ChartAnimationStore> | undefined;
  private fullScreenFigureStore!: Store<FullScreenFigureStore>;
  private dataLayerRenderer!: Store<DataLayerRenderer>;
  private hoveredTableStore!: Store<HoveredTableStore>;

  setup(): void {
    this.animationStore = useStore(ChartAnimationStore);
    this.fullScreenFigureStore = useStore(FullScreenFigureStore);
    this.dataLayerRenderer = useStore(DataLayerRenderer);
    this.hoveredTableStore = useStore(HoveredTableStore);

    useEffect(() => {
      if (this.selectedCarouselItem?.type === "carouselDataView") {
        this.props.editFigureStyle?.({ "pointer-events": "none" });
      } else {
        this.props.editFigureStyle?.({ "pointer-events": "auto" });
      }
      this.updateTabsVisibility();
      this.renderDataLayer();
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
    const backgroundColor = this.env.model.getters.getSpreadsheetTheme().backgroundColor;
    if (this.selectedCarouselItem?.type === "chart") {
      const chart = this.env.model.getters.getChartRuntime(this.selectedCarouselItem.chartId);
      if ("background" in chart && chart.background) {
        cssProperties["background-color"] = chart.background;
      } else if ("chartJsConfig" in chart) {
        cssProperties["background-color"] =
          chart.chartJsConfig.options?.plugins?.background?.color || backgroundColor;
      }
    } else {
      cssProperties["background-color"] = backgroundColor;
    }
    return cssPropertiesToCss(cssProperties);
  }

  get isDataLayer(): boolean {
    return this.selectedCarouselItem?.type === "dataLayer";
  }

  get isRowLayout(): boolean {
    return this.carousel.layout === "row";
  }

  getRowItemStyle(index: number): string {
    const count = this.carousel.items.length;
    const widthPercent = 100 / count;
    return cssPropertiesToCss({
      width: `${widthPercent}%`,
      height: "100%",
      "flex-shrink": "0",
    });
  }

  getRowItemChartComponent(item: CarouselItem): new (...args: any) => Component {
    if (item.type !== "chart") {
      throw new Error("Item is not a chart");
    }
    const type = this.env.model.getters.getChartType(item.chartId);
    const component = chartComponentRegistry.get(type);
    if (!component) {
      throw new Error(`Component is not defined for type ${type}`);
    }
    return component;
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
    const type = this.selectedCarouselItem?.type;
    if (type === "chart" || type === "dataLayer") {
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

  private getDataLayerCellFromMouseEvent(event: MouseEvent): CellPosition | undefined {
    const item = this.selectedCarouselItem;
    if (item?.type !== "dataLayer") {
      return undefined;
    }
    const canvas = this.dataLayerCanvasRef.el as HTMLCanvasElement | null;
    if (!canvas) {
      return undefined;
    }
    const canvasRect = canvas.getBoundingClientRect();
    const x = event.clientX - canvasRect.left;
    const y = event.clientY - canvasRect.top;
    const zone = toZone(item.rangeXc);
    const rect = { x: 0, y: 0, width: canvasRect.width, height: canvasRect.height };
    return getDataLayerCellPosition(this.env.model.getters, item.sheetId, zone, rect, x, y);
  }

  onDataLayerClick(event: MouseEvent) {
    const position = this.getDataLayerCellFromMouseEvent(event);
    if (!position) {
      return;
    }
    // Check icon onClick (e.g. filter icon in fullscreen)
    const icon = this.getClickableIconAtPosition(position);
    if (icon?.onClick) {
      if (icon.type === "filter_icon" && this.props.isFullScreen) {
        this.filterPopover.isOpen = true;
        this.filterPopover.anchorRect = {
          x: event.clientX,
          y: event.clientY,
          width: 0,
          height: 0,
        };
        this.filterPopover.filterPosition = { col: position.col, row: position.row };
        this.filterPopover.sheetId = position.sheetId;
      } else {
        icon.onClick(position, this.env);
      }
      return;
    }
    const clickableItem = this.getClickableItemAtPosition(position);
    if (clickableItem) {
      clickableItem.execute(position, this.env);
    }
  }

  onDataLayerMouseMove(event: MouseEvent) {
    const canvas = this.dataLayerCanvasRef.el as HTMLCanvasElement | null;
    if (!canvas) {
      return;
    }
    const position = this.getDataLayerCellFromMouseEvent(event);
    const icon = position ? this.getClickableIconAtPosition(position) : undefined;
    const clickable = position
      ? icon?.onClick || this.getClickableItemAtPosition(position)
      : undefined;
    canvas.style.cursor = clickable ? "pointer" : "";
    if (position) {
      this.hoveredTableStore.hover(position);
    }
  }

  onDataLayerMouseLeave() {
    this.hoveredTableStore.clear();
  }

  closeFilterPopover() {
    this.filterPopover.isOpen = false;
  }

  private getClickableIconAtPosition(position: CellPosition) {
    const icons = this.env.model.getters.getCellIcons(position);
    return icons.find((icon) => icon?.onClick);
  }

  private getClickableItemAtPosition(position: CellPosition) {
    const getters = this.env.model.getters;
    const items = clickableCellRegistry.getAll().sort((a, b) => a.sequence - b.sequence);
    for (const item of items) {
      if (item.condition(position, getters)) {
        return item;
      }
    }
    return undefined;
  }

  onDataLayerContextMenu(event: MouseEvent) {
    const position = this.getDataLayerCellFromMouseEvent(event);
    if (position) {
      this.env.model.dispatch("ACTIVATE_SHEET", {
        sheetIdFrom: this.env.model.getters.getActiveSheetId(),
        sheetIdTo: position.sheetId,
      });
      this.env.model.selection.selectCell(position.col, position.row);
      this.props.openContextMenu?.({
        x: event.clientX,
        y: event.clientY,
        width: 0,
        height: 0,
      });
    }
  }

  private renderDataLayer() {
    // Read reactive state so OWL re-runs this effect when hover changes
    void this.hoveredTableStore.col;
    void this.hoveredTableStore.row;

    const item = this.selectedCarouselItem;
    if (item?.type !== "dataLayer") {
      return;
    }
    const canvas = this.dataLayerCanvasRef.el as HTMLCanvasElement | null;
    if (!canvas) {
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.scale(dpr, dpr);
    const zone = toZone(item.rangeXc);
    const paddingBg = this.env.model.getters.getSpreadsheetTheme().backgroundColor;
    this.dataLayerRenderer.render(
      ctx,
      item.sheetId,
      zone,
      { x: 0, y: 0, width: rect.width, height: rect.height },
      {
        paddingBackground: paddingBg,
        hideGridLines: this.env.isDashboard(),
        hideFilterIcons: !this.props.isFullScreen,
      }
    );
  }
}
