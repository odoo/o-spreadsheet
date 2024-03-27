import { useExternalListener, useState } from "@odoo/owl";
import {
  CHART_WATERFALL_NEGATIVE_COLOR,
  CHART_WATERFALL_POSITIVE_COLOR,
  CHART_WATERFALL_SUBTOTAL_COLOR,
} from "../../../../constants";
import { Color } from "../../../../types";
import { WaterfallChartDefinition } from "../../../../types/chart/waterfall_chart";
import { GenericChartDesignPanel } from "../line_bar_pie_panel/design_panel";
import { Checkbox } from "./../../components/checkbox/checkbox";
import { RoundColorPicker } from "./../../components/round_color_picker/round_color_picker";

export class WaterfallChartDesignPanel extends GenericChartDesignPanel {
  static template = "o-spreadsheet-WaterfallChartDesignPanel";
  static components = { ...GenericChartDesignPanel.components, Checkbox, RoundColorPicker };

  state = useState({ pickerOpened: false });
  setup() {
    super.setup();
    useExternalListener(window as any, "click", this.closePicker);
  }

  onUpdateShowSubTotals(showSubTotals: boolean) {
    this.props.updateChart(this.props.figureId, { showSubTotals });
  }

  onUpdateShowConnectorLines(showConnectorLines: boolean) {
    this.props.updateChart(this.props.figureId, { showConnectorLines });
  }

  onUpdateFirstValueAsSubtotal(firstValueAsSubtotal: boolean) {
    this.props.updateChart(this.props.figureId, { firstValueAsSubtotal });
  }

  updateColor(colorName: string, color: Color) {
    this.props.updateChart(this.props.figureId, { [colorName]: color });
  }

  closePicker() {
    this.state.pickerOpened = false;
  }

  togglePicker() {
    this.state.pickerOpened = !this.state.pickerOpened;
  }

  get positiveValuesColor() {
    return (
      (this.props.definition as WaterfallChartDefinition).positiveValuesColor ||
      CHART_WATERFALL_POSITIVE_COLOR
    );
  }

  get negativeValuesColor() {
    return (
      (this.props.definition as WaterfallChartDefinition).negativeValuesColor ||
      CHART_WATERFALL_NEGATIVE_COLOR
    );
  }

  get subTotalValuesColor() {
    return (
      (this.props.definition as WaterfallChartDefinition).subTotalValuesColor ||
      CHART_WATERFALL_SUBTOTAL_COLOR
    );
  }
}
