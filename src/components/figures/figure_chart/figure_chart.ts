import { Component } from "@odoo/owl";
import { chartComponentRegistry } from "../../../registries/chart_types";
import { ChartType, CSSProperties, FigureUI, Rect, SpreadsheetChildEnv, UID } from "../../../types";
import { ChartDashboardMenu } from "../chart/chart_dashboard_menu/chart_dashboard_menu";

interface Props {
  // props figure is currently necessary scorecards, we need the chart dimension at render to avoid having to force the
  // style by hand in the useEffect()
  figureUI: FigureUI;
  editFigureStyle?: (properties: CSSProperties) => void;
  isFullScreen?: boolean;
  openContextMenu?: (anchorRect: Rect, onClose?: () => void) => void;
}

export class ChartFigure extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartFigure";
  static props = {
    figureUI: Object,
    editFigureStyle: { type: Function, optional: true },
    isFullScreen: { type: Boolean, optional: true },
    openContextMenu: { type: Function, optional: true },
  };
  static components = { ChartDashboardMenu };

  onDoubleClick() {
    this.env.model.dispatch("SELECT_FIGURE", { figureId: this.props.figureUI.id });
    this.env.openSidePanel("ChartPanel");
  }

  get chartType(): ChartType {
    return this.env.model.getters.getChartType(this.chartId);
  }

  get chartId(): UID {
    const chartId = this.env.model.getters.getChartIdFromFigureId(this.props.figureUI.id);
    if (!chartId) {
      throw new Error(`No chart found for figure ID: ${this.props.figureUI.id}`);
    }
    return chartId;
  }

  get chartComponent(): new (...args: any) => Component {
    const type = this.chartType;
    const component = chartComponentRegistry.get(type);
    if (!component) {
      throw new Error(`Component is not defined for type ${type}`);
    }
    return component;
  }
}
