import { Component } from "@odoo/owl";
import { chartComponentRegistry } from "../../../registries/chart_types";
import { ChartType, FigureUI, Rect, SpreadsheetChildEnv } from "../../../types";
import { css } from "../../helpers/css";
import { ChartTypeSwitcherMenu } from "../chart/chart_type_switcher/chart_type_switcher";

// -----------------------------------------------------------------------------
// STYLE
// -----------------------------------------------------------------------------
css/* scss */ `
  .o-chart-container {
    width: 100%;
    height: 100%;
    position: relative;
  }
`;

interface Props {
  // props figure is currently necessary scorecards, we need the chart dimension at render to avoid having to force the
  // style by hand in the useEffect()
  figureUI: FigureUI;
  onFigureDeleted: () => void;
  openContextMenu: (rect: Rect) => void;
}

export class ChartFigure extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartFigure";
  static props = {
    figureUI: Object,
    onFigureDeleted: Function,
    openContextMenu: Function,
  };
  static components = { ChartTypeSwitcherMenu };

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
}
