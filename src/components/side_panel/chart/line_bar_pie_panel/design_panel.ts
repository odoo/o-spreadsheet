import { Component, useExternalListener, useState } from "@odoo/owl";
import { BarChartDefinition } from "../../../../types/chart/bar_chart";
import { LineChartDefinition } from "../../../../types/chart/line_chart";
import { PieChartDefinition } from "../../../../types/chart/pie_chart";
import { Color, DispatchResult, SpreadsheetChildEnv, UID } from "../../../../types/index";
import { ColorPickerWidget } from "../../../color_picker/color_picker_widget";

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

interface State {
  fillColorTool: boolean;
}

export class LineBarPieDesignPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-LineBarPieDesignPanel";
  static components = { ColorPickerWidget };

  private state: State = useState({
    fillColorTool: false,
  });

  onClick(ev: MouseEvent) {
    this.state.fillColorTool = false;
  }

  setup() {
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

  updateTitle(ev) {
    this.props.updateChart(this.props.figureId, {
      title: ev.target.value,
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
  canUpdateChart: Function,
};
