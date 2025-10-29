import { _t } from "@odoo/o-spreadsheet-engine";
import { CHART_AXIS_CHOICES } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { VerticalAxisPosition } from "@odoo/o-spreadsheet-engine/types/chart";
import {
  BubbleChartDefinition,
  BubbleColorMode,
} from "@odoo/o-spreadsheet-engine/types/chart/bubble_chart";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component } from "@odoo/owl";
import { DispatchResult, UID } from "../../../../types/index";
import { SidePanelCollapsible } from "../../components/collapsible/side_panel_collapsible";
import { RadioSelection } from "../../components/radio_selection/radio_selection";
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
  };
  static props = ChartSidePanelPropsObject;

  get axesList(): AxisDefinition[] {
    return [
      {
        id: "x",
        name: _t("Horizontal axis"),
        [this.props.definition.verticalAxisPosition === "right" ? "y1" : "y"]: _t("Vertical axis"),
      },
    ];
  }

  colorModeChoices = [
    { value: "single", label: _t("Single color") },
    { value: "multiple", label: _t("Multiple colors") },
  ];

  axisChoices = CHART_AXIS_CHOICES;

  get colorMode(): BubbleColorMode {
    const definition = this.props.definition as BubbleChartDefinition;
    return (definition.colorMode as BubbleColorMode) || "single";
  }

  onColorModeChange(mode: string) {
    this.props.updateChart(this.props.chartId, {
      colorMode: mode as BubbleColorMode,
    });
  }

  get verticalAxisPosition(): VerticalAxisPosition {
    const definition = this.props.definition as BubbleChartDefinition;
    return definition.verticalAxisPosition || "left";
  }

  updateVerticalAxisPosition(value: VerticalAxisPosition) {
    this.props.updateChart(this.props.chartId, {
      verticalAxisPosition: value,
    });
  }
}
