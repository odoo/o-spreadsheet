import { chartComponentRegistry } from "../../../registries/chart_component_registry";
import { ChartType } from "../../../types/chart/chart";
import { CSSProperties, UID } from "../../../types/misc";
import { Rect } from "../../../types/rendering";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { ChartDashboardMenu } from "../chart/chart_dashboard_menu/chart_dashboard_menu";

import { props } from "@odoo/owl";
import { Component } from "../../../owl3_compatibility_layer";
import { types } from "../../props_validation";

export class ChartFigure extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartFigure";
  static components = { ChartDashboardMenu };

  protected props = props({
    figureUI: types.FigureUI(),
    "editFigureStyle?": types.function<[properties: CSSProperties]>([types.CSSProperties()]),
    "isFullScreen?": types.boolean(),
    "openContextMenu?": types.function<[anchorRect: Rect, onClose?: () => void]>([
      types.Rect(),
      types.function([]),
    ]),
  });

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
