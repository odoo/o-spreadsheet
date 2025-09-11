import { Component, useEffect } from "@odoo/owl";
import { DEFAULT_CAROUSEL_TITLE_STYLE } from "../../../constants";
import { chartStyleToCellStyle, deepEquals } from "../../../helpers";
import { getCarouselItemTitle } from "../../../helpers/carousel_helpers";
import { chartComponentRegistry } from "../../../registries/chart_types";
import { Store, useStore } from "../../../store_engine";
import { _t } from "../../../translation";
import {
  Carousel,
  CarouselItem,
  CSSProperties,
  FigureUI,
  SpreadsheetChildEnv,
} from "../../../types";
import { FullScreenFigureStore } from "../../full_screen_figure/full_screen_figure_store";
import { cellTextStyleToCss, cssPropertiesToCss } from "../../helpers";
import { ChartDashboardMenu } from "../chart/chart_dashboard_menu/chart_dashboard_menu";
import { ChartAnimationStore } from "../chart/chartJs/chartjs_animation_store";

interface Props {
  figureUI: FigureUI;
  onFigureDeleted: () => void;
  editFigureStyle?: (properties: CSSProperties) => void;
  isFullScreen?: boolean;
}

export class CarouselFigure extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-CarouselFigure";
  static props = {
    figureUI: Object,
    onFigureDeleted: Function,
    editFigureStyle: { type: Function, optional: true },
    isFullScreen: { type: Boolean, optional: true },
  };
  static components = { ChartDashboardMenu };

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
}
