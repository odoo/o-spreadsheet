import { Component, useEffect } from "@odoo/owl";
import { DEFAULT_CAROUSEL_TITLE_STYLE } from "../../../constants";
import { chartStyleToCellStyle, deepEquals } from "../../../helpers";
import { getCarouselItemTitle } from "../../../helpers/carousel_helpers";
import { chartComponentRegistry } from "../../../registries/chart_types";
import {
  Carousel,
  CarouselItem,
  CSSProperties,
  FigureUI,
  SpreadsheetChildEnv,
} from "../../../types";
import { cellTextStyleToCss, cssPropertiesToCss } from "../../helpers";
import { ChartDashboardMenu } from "../chart/chart_dashboard_menu/chart_dashboard_menu";

interface Props {
  figureUI: FigureUI;
  onFigureDeleted: () => void;
  editFigureStyle?: (properties: CSSProperties) => void;
}

export class CarouselFigure extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-CarouselFigure";
  static props = {
    figureUI: Object,
    onFigureDeleted: Function,
    editFigureStyle: { type: Function, optional: true },
  };
  static components = { ChartDashboardMenu };

  setup(): void {
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
    return this.selectedCarouselItem?.carouselTitle?.text || "";
  }

  get titleStyle(): string {
    const style = { ...DEFAULT_CAROUSEL_TITLE_STYLE, ...this.selectedCarouselItem?.carouselTitle };
    return cssPropertiesToCss(cellTextStyleToCss(chartStyleToCellStyle(style)));
  }
}
