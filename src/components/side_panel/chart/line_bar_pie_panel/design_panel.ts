import { Component, useExternalListener, useState } from "@odoo/owl";
import { _t } from "../../../../translation";
import { BarChartDefinition } from "../../../../types/chart/bar_chart";
import { LineChartDefinition } from "../../../../types/chart/line_chart";
import { PieChartDefinition } from "../../../../types/chart/pie_chart";
import { Color, CommandResult, SpreadsheetChildEnv, UID } from "../../../../types/index";
import { ColorPickerWidget } from "../../../color_picker/color_picker_widget";

interface Props {
  figureId: UID;
  definition: LineChartDefinition | BarChartDefinition | PieChartDefinition;
  updateChart: (
    figureId: UID,
    definition: Partial<LineChartDefinition | BarChartDefinition | PieChartDefinition>
  ) => CommandResult | CommandResult[];
}

interface State {
  title: string;
  fillColorTool: boolean;
}

export class LineBarPieDesignPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-LineBarPieDesignPanel";
  static components = { ColorPickerWidget };

  private state: State = useState({
    title: "",
    fillColorTool: false,
  });

  onClick(ev: MouseEvent) {
    this.state.fillColorTool = false;
  }

  setup() {
    this.state.title = _t(this.props.definition.title);
    useExternalListener(window as any, "click", this.onClick);
  }

  toggleColorPicker() {
    this.state.fillColorTool = !this.state.fillColorTool;
  }

  updateBackgroundColor(color: Color) {
    this.props.updateChart(this.props.figureId, {
      background: color,
    });
  }

  updateTitle() {
    this.props.updateChart(this.props.figureId, {
      title: this.state.title,
    });
  }

  updateSelect(attr: string, ev) {
    this.props.updateChart(this.props.figureId, {
      [attr]: ev.target.value,
    });
  }
}

LineBarPieDesignPanel.props = {
  figureId: String,
  definition: Object,
  updateChart: Function,
};
