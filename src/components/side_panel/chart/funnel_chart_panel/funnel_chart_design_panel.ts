import { props } from "@odoo/owl";
import { getFunnelLabelColors } from "../../../../helpers/figures/charts/runtime/chartjs_dataset";
import { replaceItemAtIndex } from "../../../../helpers/misc";
import { _t } from "../../../../translation";
import { FunnelChartDefinition, FunnelChartRuntime } from "../../../../types/chart/funnel_chart";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { types } from "../../../props_validation";
import { SidePanelCollapsible } from "../../components/collapsible/side_panel_collapsible";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { Section } from "../../components/section/section";
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";
import { ChartHumanizeNumbers } from "../building_blocks/humanize_numbers/humanize_numbers";
import { ChartShowValues } from "../building_blocks/show_values/show_values";
import { ChartSidePanelProps, chartSidePanelPropsDefinition } from "../common";

import { Component } from "../../../../owl3_compatibility_layer";
import { useModel } from "../../../owl_plugins/model_plugin";

type Props = ChartSidePanelProps<FunnelChartDefinition<string>>;

export class FunnelChartDesignPanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FunnelChartDesignPanel";
  static components = {
    ChartShowValues,
    GeneralDesignEditor,
    SidePanelCollapsible,
    RoundColorPicker,
    Section,
    ChartHumanizeNumbers,
  };

  protected props: Props = props({
    ...chartSidePanelPropsDefinition,
    definition: types.FunnelChartDefinition(),
  }) as unknown as Props;

  getFunnelColorItems() {
    const runtime = this.model().getters.getChartRuntime(this.props.chartId) as FunnelChartRuntime;
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

  private model = useModel();
}
