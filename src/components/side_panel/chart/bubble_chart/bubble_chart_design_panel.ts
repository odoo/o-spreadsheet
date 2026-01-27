import { props } from "@odoo/owl";
import { FIRST_CHART_COLOR } from "../../../../helpers/color";
import { CHART_AXIS_CHOICES } from "../../../../helpers/figures/charts/chart_common";
import { Component } from "../../../../owl3_compatibility_layer";
import { _t } from "../../../../translation";
import { BubbleChartDefinition } from "../../../../types/chart/bubble_chart";
import { VerticalAxisPosition } from "../../../../types/chart/common_chart";
import { Color } from "../../../../types/misc";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { Checkbox } from "../../components/checkbox/checkbox";
import { SidePanelCollapsible } from "../../components/collapsible/side_panel_collapsible";
import { RadioSelection } from "../../components/radio_selection/radio_selection";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { Section } from "../../components/section/section";
import { ChartAnnotation } from "../building_blocks/annotation/annotation";
import {
  AxisDefinition,
  AxisDesignEditor,
} from "../building_blocks/axis_design/axis_design_editor";
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";
import { ChartHumanizeNumbers } from "../building_blocks/humanize_numbers/humanize_numbers";
import { ChartLegend } from "../building_blocks/legend/legend";
import { ChartShowValues } from "../building_blocks/show_values/show_values";
import { ChartSidePanelProps, chartSidePanelPropsDefinition } from "../common";

export class BubbleChartDesignPanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-BubbleChartDesignPanel";
  static components = {
    GeneralDesignEditor,
    SidePanelCollapsible,
    Section,
    AxisDesignEditor,
    ChartLegend,
    ChartShowValues,
    ChartHumanizeNumbers,
    RadioSelection,
    RoundColorPicker,
    Checkbox,
    ChartAnnotation,
  };
  protected props = props(
    chartSidePanelPropsDefinition
  ) as unknown as ChartSidePanelProps<BubbleChartDefinition>;

  get axesList(): AxisDefinition[] {
    return [
      { id: "x", name: _t("Horizontal axis") },
      { id: this.verticalAxisPosition === "right" ? "y1" : "y", name: _t("Vertical axis") },
    ];
  }

  colorModeChoices = [
    { value: "single", label: _t("Single color") },
    { value: "multiple", label: _t("Multiple colors") },
  ];

  axisChoices = CHART_AXIS_CHOICES;

  get colorMode(): "multiple" | "single" {
    const definition = this.props.definition as BubbleChartDefinition;
    return definition.bubbleColor.color === "multiple" ? "multiple" : "single";
  }

  onColorModeChange(mode: "multiple" | "single") {
    this.updateBubbleColor(mode === "multiple" ? "multiple" : FIRST_CHART_COLOR);
  }

  get verticalAxisPosition(): VerticalAxisPosition {
    const definition = this.props.definition as BubbleChartDefinition;
    return definition.verticalAxisPosition ?? "left";
  }

  updateVerticalAxisPosition(value: VerticalAxisPosition) {
    this.props.updateChart(this.props.chartId, {
      verticalAxisPosition: value,
    });
  }

  updateBubbleColor(color: string | "multiple") {
    const colorMode = this.props.definition.bubbleColor;
    this.props.updateChart(this.props.chartId, {
      bubbleColor: {
        ...colorMode,
        color,
      },
    });
  }

  get currentBubbleColor(): Color {
    const mode = this.colorMode;
    return mode !== "multiple" ? this.props.definition.bubbleColor.color : FIRST_CHART_COLOR;
  }

  get areBubblesTransparent(): boolean {
    return this.props.definition.bubbleColor.transparent || false;
  }

  updateBubbleTransparency(transparent: boolean) {
    const colorMode = this.props.definition.bubbleColor;
    this.props.updateChart(this.props.chartId, {
      bubbleColor: {
        ...colorMode,
        transparent,
      },
    });
  }
}
