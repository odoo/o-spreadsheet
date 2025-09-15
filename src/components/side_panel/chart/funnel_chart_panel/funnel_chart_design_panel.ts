import { Component } from "@odoo/owl";
import { replaceItemAtIndex } from "../../../../helpers";
import { getFunnelLabelColors } from "../../../../helpers/figures/charts/runtime";
import { _t } from "../../../../translation";
import { FunnelChartDefinition, FunnelChartRuntime } from "../../../../types/chart";
import { SpreadsheetChildEnv } from "../../../../types/index";
import { SidePanelCollapsible } from "../../components/collapsible/side_panel_collapsible";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { Section } from "../../components/section/section";
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";
import { ChartHumanizeNumbers } from "../building_blocks/humanize_numbers/humanize_numbers";
import { ChartShowValues } from "../building_blocks/show_values/show_values";
import { ChartSidePanelProps } from "../common";

export class FunnelChartDesignPanel extends Component<
  ChartSidePanelProps<FunnelChartDefinition>,
  SpreadsheetChildEnv
> {
  static template = "o-spreadsheet-FunnelChartDesignPanel";
  static components = {
    ChartShowValues,
    GeneralDesignEditor,
    SidePanelCollapsible,
    RoundColorPicker,
    Section,
    ChartHumanizeNumbers,
  };
  static props = {
    chartId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: Function,
  };

  getFunnelColorItems() {
    const runtime = this.env.model.getters.getChartRuntime(
      this.props.chartId
    ) as FunnelChartRuntime;
    const labels: string[] = (runtime.chartJsConfig.data.labels || []) as string[];
    const colors = getFunnelLabelColors(labels, this.props.definition.funnelColors);
    return labels.map((label, index) => ({
      label: label || _t("Value %s", index + 1),
      color: colors[index],
    }));
  }

  updateFunnelItemColor(index: number, color: string) {
    const funnelColors = replaceItemAtIndex(this.props.definition.funnelColors || [], color, index);
    this.props.updateChart(this.props.chartId, { funnelColors });
  }
}
