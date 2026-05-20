import { Component } from "@odoo/owl";
import { FIRST_CHART_COLOR } from "../../../../helpers/color";
import { _t } from "../../../../translation";
import { BubbleChartDefinition } from "../../../../types/chart/bubble_chart";
import { GeoBubbleChartDefinition } from "../../../../types/chart/geo_bubble_chart";
import { DispatchResult } from "../../../../types/commands";
import { Color, UID } from "../../../../types/misc";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { Checkbox } from "../../components/checkbox/checkbox";
import { RadioSelection } from "../../components/radio_selection/radio_selection";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { Section } from "../../components/section/section";
import { ChartSidePanelPropsObject } from "../common";

interface Props {
  chartId: UID;
  definition: BubbleChartDefinition | GeoBubbleChartDefinition;
  canUpdateChart: (chartId: UID, definition: Partial<BubbleChartDefinition>) => DispatchResult;
  updateChart: (chartId: UID, definition: Partial<BubbleChartDefinition>) => DispatchResult;
}

export class BubbleDesignSection extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-BubbleDesignSection";
  static components = {
    Section,
    RadioSelection,
    RoundColorPicker,
    Checkbox,
  };
  static props = ChartSidePanelPropsObject;

  colorModeChoices = [
    { value: "single", label: _t("Single color") },
    { value: "multiple", label: _t("Multiple colors") },
  ];

  get colorMode(): "multiple" | "single" {
    const definition = this.props.definition as BubbleChartDefinition;
    return definition.bubbleColor.color === "multiple" ? "multiple" : "single";
  }

  onColorModeChange(mode: "multiple" | "single") {
    this.updateBubbleColor(mode === "multiple" ? "multiple" : FIRST_CHART_COLOR);
  }

  updateBubbleColor(color: string | "multiple") {
    const colorMode = this.props.definition.bubbleColor;
    this.props.updateChart(this.props.chartId, {
      bubbleColor: { ...colorMode, color },
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
      bubbleColor: { ...colorMode, transparent },
    });
  }
}
