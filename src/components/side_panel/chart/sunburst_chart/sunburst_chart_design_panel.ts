import { Component } from "@odoo/owl";
import { deepCopy } from "../../../../helpers";
import {
  SunburstChartDefaults,
  SunburstChartDefinition,
  SunburstChartJSDataset,
  SunburstChartRuntime,
} from "../../../../types/chart";
import { DispatchResult, SpreadsheetChildEnv, UID } from "../../../../types/index";
import { Checkbox } from "../../components/checkbox/checkbox";
import { SidePanelCollapsible } from "../../components/collapsible/side_panel_collapsible";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { Section } from "../../components/section/section";
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";
import { ChartLegend } from "../building_blocks/legend/legend";
import { TextStyler } from "../building_blocks/text_styler/text_styler";

interface Props {
  figureId: UID;
  definition: SunburstChartDefinition;
  canUpdateChart: (figureID: UID, definition: Partial<SunburstChartDefinition>) => DispatchResult;
  updateChart: (figureId: UID, definition: Partial<SunburstChartDefinition>) => DispatchResult;
}

export class SunburstChartDesignPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SunburstChartDesignPanel";
  static components = {
    GeneralDesignEditor,
    Section,
    SidePanelCollapsible,
    Checkbox,
    TextStyler,
    RoundColorPicker,
    ChartLegend,
  };
  static props = {
    figureId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: { type: Function, optional: true },
  };

  defaults = SunburstChartDefaults;

  get showValues() {
    return this.props.definition.showValues ?? SunburstChartDefaults.showValues;
  }

  get showLabels() {
    return this.props.definition.showLabels ?? SunburstChartDefaults.showLabels;
  }

  get groupColors() {
    const figureId = this.props.figureId;
    const runtime = this.env.model.getters.getChartRuntime(figureId) as SunburstChartRuntime;
    const dataset = runtime.chartJsConfig.data.datasets[0] as SunburstChartJSDataset;
    return dataset?.groupColors || [];
  }

  onGroupColorChanged(index: number, color: string) {
    const colors = deepCopy(this.props.definition.groupColors) ?? [];
    colors[index] = color;
    this.props.updateChart(this.props.figureId, { groupColors: colors });
  }
}
