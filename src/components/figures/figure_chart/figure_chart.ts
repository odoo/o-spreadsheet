import { Component } from "@odoo/owl";
import { chartComponentRegistry } from "../../../registries/chart_types";
import { Store, useStore } from "../../../store_engine";
import { ChartType, FigureUI, SpreadsheetChildEnv } from "../../../types";
import { css } from "../../helpers/css";
import { ChartDashboardMenu } from "../chart/chart_dashboard_menu/chart_dashboard_menu";
import { ZoomableChartStore } from "../chart/chartJs/zoomable_chart/zoomable_chart_store";

// -----------------------------------------------------------------------------
// STYLE
// -----------------------------------------------------------------------------
css/* scss */ `
  .o-figure-zoom-icons {
    margin-right: 2.5rem !important;
  }
`;

interface Props {
  // props figure is currently necessary scorecards, we need the chart dimension at render to avoid having to force the
  // style by hand in the useEffect()
  figureUI: FigureUI;
  onFigureDeleted: () => void;
}

export class ChartFigure extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartFigure";
  static props = {
    figureUI: Object,
    onFigureDeleted: Function,
  };
  static components = { ChartDashboardMenu };

  private store!: Store<ZoomableChartStore>;

  setup() {
    this.store = useStore(ZoomableChartStore);
  }

  onDoubleClick() {
    this.env.model.dispatch("SELECT_FIGURE", { figureId: this.props.figureUI.id });
    this.env.openSidePanel("ChartPanel");
  }

  get chartType(): ChartType {
    return this.env.model.getters.getChartType(this.props.figureUI.id);
  }

  get chartComponent(): new (...args: any) => Component {
    const type = this.chartType;
    const component = chartComponentRegistry.get(type);
    if (!component) {
      throw new Error(`Component is not defined for type ${type}`);
    }
    return component;
  }

  get zoomEnabled() {
    if (this.env.isDashboard()) {
      return false;
    }
    const definition = this.env.model.getters.getChartDefinition(this.props.figureUI.id);
    return "zoomable" in definition && definition.zoomable;
  }

  resetZoom() {
    const figureId = this.props.figureUI.id;
    const chartType = this.env.model.getters.getChartType(figureId);
    const chartId = `${chartType}-${figureId}`;
    this.store.updateAxisLimits(chartId, this.store.originalAxisLimits[chartId].x);
    this.env.model.dispatch("EVALUATE_CHARTS");
  }

  get isZoomResetable() {
    const figureId = this.props.figureUI.id;
    const definition = this.env.model.getters.getChartDefinition(figureId);
    const chartId = `${definition.type}-${figureId}`;
    const originalAxisLimits = this.store.originalAxisLimits[chartId]?.x;
    const currentAxisLimits = this.store.currentAxesLimits[chartId]?.x;
    return (
      (currentAxisLimits?.min !== undefined || currentAxisLimits?.max !== undefined) &&
      (originalAxisLimits?.min !== currentAxisLimits.min ||
        originalAxisLimits?.max !== currentAxisLimits.max)
    );
  }
}
