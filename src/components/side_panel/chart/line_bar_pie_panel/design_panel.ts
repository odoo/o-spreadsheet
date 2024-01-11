import { Component } from "@odoo/owl";
import { _t } from "../../../../translation";
import { BarChartDefinition } from "../../../../types/chart/bar_chart";
import { LineChartDefinition } from "../../../../types/chart/line_chart";
import { PieChartDefinition } from "../../../../types/chart/pie_chart";
import { Color, DispatchResult, SpreadsheetChildEnv, UID } from "../../../../types/index";
import { Section } from "../../components/section/section";
import { ChartColor } from "../building_blocks/color/color";
import { ChartTitle } from "../building_blocks/title/title";

interface Props {
  figureId: UID;
  definition: LineChartDefinition | BarChartDefinition | PieChartDefinition;
  canUpdateChart: (
    definition: Partial<LineChartDefinition | BarChartDefinition | PieChartDefinition>
  ) => DispatchResult;
  updateChart: (
    figureId: UID,
    definition: Partial<LineChartDefinition | BarChartDefinition | PieChartDefinition>
  ) => DispatchResult;
}

export class LineBarPieDesignPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-LineBarPieDesignPanel";
  static components = { ChartColor, ChartTitle, Section };
  static props = {
    figureId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: Function,
  };

  get title() {
    return _t(this.props.definition.title);
  }

  updateBackgroundColor(color: Color) {
    this.props.updateChart(this.props.figureId, {
      background: color,
    });
  }

  updateTitle(title: string) {
    this.props.updateChart(this.props.figureId, { title });
  }

  updateSelect(attr: string, ev) {
    this.props.updateChart(this.props.figureId, {
      [attr]: ev.target.value,
    });
  }
}
