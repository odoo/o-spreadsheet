import { Component } from "@odoo/owl";
import { replaceItemAtIndex } from "../../../../helpers";
import { getFunnelLabelColors } from "../../../../helpers/figures/charts/runtime";
import { _t } from "../../../../translation";
import { FunnelChartDefinition, FunnelChartRuntime } from "../../../../types/chart";
import { DispatchResult, SpreadsheetChildEnv, UID } from "../../../../types/index";
import { Checkbox } from "../../components/checkbox/checkbox";
import { SidePanelCollapsible } from "../../components/collapsible/side_panel_collapsible";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { Section } from "../../components/section/section";
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";

interface Props {
  figureId: UID;
  definition: FunnelChartDefinition;
  canUpdateChart: (figureID: UID, definition: Partial<FunnelChartDefinition>) => DispatchResult;
  updateChart: (figureId: UID, definition: Partial<FunnelChartDefinition>) => DispatchResult;
}

export class FunnelChartDesignPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FunnelChartDesignPanel";
  static components = {
    GeneralDesignEditor,
    SidePanelCollapsible,
    RoundColorPicker,
    Section,
    Checkbox,
  };
  static props = {
    figureId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: Function,
  };

  getFunnelColorItems() {
    const runtime = this.env.model.getters.getChartRuntime(
      this.props.figureId
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
    this.props.updateChart(this.props.figureId, { funnelColors });
  }
}
