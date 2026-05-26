import {
  CHART_WATERFALL_NEGATIVE_COLOR,
  CHART_WATERFALL_POSITIVE_COLOR,
  CHART_WATERFALL_SUBTOTAL_COLOR,
} from "../../../../constants";
import { CHART_AXIS_CHOICES } from "../../../../helpers/figures/charts/chart_common";
import { _t } from "../../../../translation";
import { VerticalAxisPosition } from "../../../../types/chart/common_chart";
import { WaterfallChartDefinition } from "../../../../types/chart/waterfall_chart";
import { Color } from "../../../../types/misc";
import { RadioSelection } from "../../components/radio_selection/radio_selection";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { AxisDefinition } from "../building_blocks/axis_design/axis_design_editor";
import { ChartSidePanelProps } from "../common";
import { GenericZoomableChartDesignPanel } from "../zoomable_chart/design_panel";

export class WaterfallChartDesignPanel extends GenericZoomableChartDesignPanel<
  ChartSidePanelProps<WaterfallChartDefinition<string>>
> {
  static template = "o-spreadsheet-WaterfallChartDesignPanel";
  static components = {
    ...GenericZoomableChartDesignPanel.components,
    RoundColorPicker,
    RadioSelection,
  };

  axisChoices = CHART_AXIS_CHOICES;

  onUpdateShowSubTotals(showSubTotals: boolean) {
    this.props.updateChart(this.props.chartId, { showSubTotals });
  }

  onUpdateShowConnectorLines(showConnectorLines: boolean) {
    this.props.updateChart(this.props.chartId, { showConnectorLines });
  }

  onUpdateFirstValueAsSubtotal(firstValueAsSubtotal: boolean) {
    this.props.updateChart(this.props.chartId, { firstValueAsSubtotal });
  }

  updateColor(colorName: string, color: Color) {
    this.props.updateChart(this.props.chartId, { [colorName]: color });
  }

  get axesList(): AxisDefinition[] {
    return [
      { id: "x", name: _t("Horizontal axis") },
      { id: "y", name: _t("Vertical axis") },
    ];
  }

  get positiveValuesColor() {
    return (
      (this.props.definition as WaterfallChartDefinition<string>).positiveValuesColor ||
      CHART_WATERFALL_POSITIVE_COLOR
    );
  }

  get negativeValuesColor() {
    return (
      (this.props.definition as WaterfallChartDefinition<string>).negativeValuesColor ||
      CHART_WATERFALL_NEGATIVE_COLOR
    );
  }

  get subTotalValuesColor() {
    return (
      (this.props.definition as WaterfallChartDefinition<string>).subTotalValuesColor ||
      CHART_WATERFALL_SUBTOTAL_COLOR
    );
  }

  updateVerticalAxisPosition(value: VerticalAxisPosition) {
    this.props.updateChart(this.props.chartId, {
      verticalAxisPosition: value,
    });
  }
}
