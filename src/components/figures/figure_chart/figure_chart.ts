import { Component } from "@odoo/owl";
import { chartComponentRegistry } from "../../../registries/chart_types";
import type { ChartType, Figure, SpreadsheetChildEnv } from "../../../types";
import { css } from "../../helpers/css";

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
  figure: Figure;
  onFigureDeleted: () => void;
}

export class ChartFigure extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartFigure";
  static components = {};

  onDoubleClick() {
    this.env.model.dispatch("SELECT_FIGURE", { id: this.props.figure.id });
    this.env.openSidePanel("ChartPanel");
  }

  get chartType(): ChartType {
    return this.env.model.getters.getChartType(this.props.figure.id);
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

ChartFigure.props = {
  figure: Object,
  onFigureDeleted: Function,
};
