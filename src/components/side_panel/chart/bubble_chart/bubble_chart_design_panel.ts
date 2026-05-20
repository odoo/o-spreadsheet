import { Component } from "@odoo/owl";
import { CHART_AXIS_CHOICES } from "../../../../helpers/figures/charts/chart_common";
import { _t } from "../../../../translation";
import { BubbleChartDefinition } from "../../../../types/chart/bubble_chart";
import { VerticalAxisPosition } from "../../../../types/chart/common_chart";
import { DispatchResult } from "../../../../types/commands";
import { UID } from "../../../../types/misc";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
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
import { BubbleDesignSection } from "./bubble_design_section.ts";

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
    BubbleDesignSection,
  };
  static props = ChartSidePanelPropsObject;

  get axesList(): AxisDefinition[] {
    return [
      { id: "x", name: _t("Horizontal axis") },
      { id: this.verticalAxisPosition === "right" ? "y1" : "y", name: _t("Vertical axis") },
    ];
  }

  axisChoices = CHART_AXIS_CHOICES;

  get verticalAxisPosition(): VerticalAxisPosition {
    const definition = this.props.definition as BubbleChartDefinition;
    return definition.verticalAxisPosition ?? "left";
  }

  updateVerticalAxisPosition(value: VerticalAxisPosition) {
    this.props.updateChart(this.props.chartId, {
      verticalAxisPosition: value,
    });
  }
}
