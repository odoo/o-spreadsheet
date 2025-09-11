import { Component } from "@odoo/owl";
import {
  CHART_WATERFALL_NEGATIVE_COLOR,
  CHART_WATERFALL_POSITIVE_COLOR,
  CHART_WATERFALL_SUBTOTAL_COLOR,
} from "../../../../constants";
import { CHART_AXIS_CHOICES } from "../../../../helpers/figures/charts";
import { _t } from "../../../../translation";
import { Color, SpreadsheetChildEnv } from "../../../../types";
import { WaterfallChartDefinition } from "../../../../types/chart/waterfall_chart";
import { SidePanelCollapsible } from "../../components/collapsible/side_panel_collapsible";
import { RadioSelection } from "../../components/radio_selection/radio_selection";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { Section } from "../../components/section/section";
import {
  AxisDefinition,
  AxisDesignEditor,
} from "../building_blocks/axis_design/axis_design_editor";
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";
import { ChartHumanizeNumbers } from "../building_blocks/humanize_numbers/humanize_numbers";
import { ChartLegend } from "../building_blocks/legend/legend";
import { ChartShowValues } from "../building_blocks/show_values/show_values";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../common";
import { Checkbox } from "./../../components/checkbox/checkbox";

export class WaterfallChartDesignPanel extends Component<
  ChartSidePanelProps<WaterfallChartDefinition>,
  SpreadsheetChildEnv
> {
  static template = "o-spreadsheet-WaterfallChartDesignPanel";
  static components = {
    GeneralDesignEditor,
    ChartShowValues,
    Checkbox,
    SidePanelCollapsible,
    Section,
    RoundColorPicker,
    AxisDesignEditor,
    RadioSelection,
    ChartLegend,
    ChartHumanizeNumbers,
  };
  static props = ChartSidePanelPropsObject;

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

  updateVerticalAxisPosition(value: "left" | "right") {
    this.props.updateChart(this.props.chartId, {
      verticalAxisPosition: value,
    });
  }

  onToggleZoom(zoomable: boolean) {
    this.props.updateChart(this.props.chartId, {
      zoomable,
    });
  }
}
