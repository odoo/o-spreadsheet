import { _t, Color } from "@odoo/o-spreadsheet-engine";
import { ORIGINAL_BLUE } from "@odoo/o-spreadsheet-engine/helpers/color";
import { CHART_AXIS_CHOICES } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { VerticalAxisPosition } from "@odoo/o-spreadsheet-engine/types/chart";
import { BubbleChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart/bubble_chart";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component } from "@odoo/owl";
import { DispatchResult, UID } from "../../../../types/index";
import { Checkbox } from "../../components/checkbox/checkbox";
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
import { ChartSidePanelPropsObject } from "../common";

interface Props {
  chartId: UID;
  definition: BubbleChartDefinition;
  canUpdateChart: (chartId: UID, definition: Partial<BubbleChartDefinition>) => DispatchResult;
  updateChart: (chartId: UID, definition: Partial<BubbleChartDefinition>) => DispatchResult;
}

export class BubbleChartDesignPanel extends Component<Props, SpreadsheetChildEnv> {
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
  };
  static props = ChartSidePanelPropsObject;

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
    this.updateBubbleColor(mode === "multiple" ? "multiple" : ORIGINAL_BLUE);
  }

  get verticalAxisPosition(): VerticalAxisPosition {
    const definition = this.props.definition as BubbleChartDefinition;
    return definition.dataSets[0]?.yAxisId === "y1" ? "right" : "left";
  }

  updateVerticalAxisPosition(value: VerticalAxisPosition) {
    const dataSets = this.props.definition.dataSets;
    dataSets[0] = { ...dataSets[0], yAxisId: value === "right" ? "y1" : "y" };
    this.props.updateChart(this.props.chartId, {
      dataSets,
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
    return mode !== "multiple" ? this.props.definition.bubbleColor.color : ORIGINAL_BLUE;
  }

  get opacity(): boolean {
    return this.props.definition.bubbleColor.opacity || false;
  }

  updateBubbleOpacity(value: boolean) {
    const colorMode = this.props.definition.bubbleColor;
    this.props.updateChart(this.props.chartId, {
      bubbleColor: {
        ...colorMode,
        opacity: value,
      },
    });
  }
}
