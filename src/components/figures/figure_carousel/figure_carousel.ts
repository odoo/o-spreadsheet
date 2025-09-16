import { Component, useEffect, useRef, useState } from "@odoo/owl";
import { ActionSpec, createActions } from "../../../actions/action";
import { DEFAULT_CAROUSEL_TITLE_STYLE } from "../../../constants";
import { chartStyleToCellStyle, deepEquals } from "../../../helpers";
import { getCarouselItemTitle } from "../../../helpers/carousel_helpers";
import { chartComponentRegistry } from "../../../registries/chart_types";
import { Store, useStore } from "../../../store_engine";
import {
  CSSProperties,
  Carousel,
  CarouselItem,
  FigureUI,
  MenuMouseEvent,
  Rect,
  SpreadsheetChildEnv,
} from "../../../types";
import { cellTextStyleToCss, cssPropertiesToCss } from "../../helpers";
import { getBoundingRectAsPOJO, getRefBoundingRect } from "../../helpers/dom_helpers";
import { MenuPopover, MenuState } from "../../menu_popover/menu_popover";
import { ChartDashboardMenu } from "../chart/chart_dashboard_menu/chart_dashboard_menu";
import { ChartAnimationStore } from "../chart/chartJs/chartjs_animation_store";

interface Props {
  figureUI: FigureUI;
  onFigureDeleted: () => void;
  editFigureStyle?: (properties: CSSProperties) => void;
  openContextMenu: (anchorRect: Rect, onClose?: () => void) => void;
}

export class CarouselFigure extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-CarouselFigure";
  static props = {
    figureUI: Object,
    onFigureDeleted: Function,
    editFigureStyle: { type: Function, optional: true },
    openContextMenu: Function,
  };
  static components = { ChartDashboardMenu, MenuPopover };

  private carouselTabsRef = useRef("carouselTabs");
  private carouselTabsDropdownRef = useRef("carouselTabsDropdown");

  private menuState = useState<MenuState>({ isOpen: false, anchorRect: null, menuItems: [] });
  private hiddenItems: CarouselItem[] = [];

  protected animationStore: Store<ChartAnimationStore> | undefined;
  private state = useState({ isMenuActive: false });

  setup(): void {
    this.animationStore = useStore(ChartAnimationStore);

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
      this.animationStore?.enableAnimationForChart(item.chartId);
    }
  }

  get headerStyle(): string {
    const cssProperties: CSSProperties = {};
    if (this.selectedCarouselItem?.type === "carouselDataView") {
      cssProperties["background-color"] = "#ffffff";
    } else if (this.selectedCarouselItem?.type === "chart") {
      const chart = this.env.model.getters.getChartRuntime(this.selectedCarouselItem.chartId);
      cssProperties["background-color"] = chart.background;
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

  openContextMenu(event: MouseEvent) {
    const target = event.currentTarget as HTMLElement;
    if (target) {
      this.state.isMenuActive = true;
      this.props.openContextMenu(
        getBoundingRectAsPOJO(target),
        () => (this.state.isMenuActive = false)
      );
    }
  }
}
