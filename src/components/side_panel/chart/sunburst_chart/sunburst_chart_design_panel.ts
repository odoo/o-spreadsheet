import { Component } from "@odoo/owl";
import { deepCopy } from "../../../../helpers";
import {
  SunburstChartDefaults,
  SunburstChartDefinition,
  SunburstChartJSDataset,
  SunburstChartRuntime,
} from "../../../../types/chart";
import { SpreadsheetChildEnv } from "../../../../types/index";
import { Checkbox } from "../../components/checkbox/checkbox";
import { SidePanelCollapsible } from "../../components/collapsible/side_panel_collapsible";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { Section } from "../../components/section/section";
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";
import { ChartLegend } from "../building_blocks/legend/legend";
import { PieHoleSize } from "../building_blocks/pie_hole_size/pie_hole_size";
import { ChartShowValues } from "../building_blocks/show_values/show_values";
import { TextStyler } from "../building_blocks/text_styler/text_styler";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../common";

export class SunburstChartDesignPanel extends Component<
  ChartSidePanelProps<SunburstChartDefinition>,
  SpreadsheetChildEnv
> {
  static template = "o-spreadsheet-SunburstChartDesignPanel";
  static components = {
    GeneralDesignEditor,
    Section,
    SidePanelCollapsible,
    ChartShowValues,
    Checkbox,
    TextStyler,
    RoundColorPicker,
    ChartLegend,
    PieHoleSize,
  };
  static props = ChartSidePanelPropsObject;

  defaults = SunburstChartDefaults;

  get showValues() {
    return this.props.definition.showValues ?? SunburstChartDefaults.showValues;
  }

  get showLabels() {
    return this.props.definition.showLabels ?? SunburstChartDefaults.showLabels;
  }

  get groupColors() {
    const chartId = this.props.chartId;
    const runtime = this.env.model.getters.getChartRuntime(chartId) as SunburstChartRuntime;
    const dataset = runtime.chartJsConfig.data.datasets[0] as SunburstChartJSDataset;
    return dataset?.groupColors || [];
  }

  onGroupColorChanged(index: number, color: string) {
    const colors = deepCopy(this.props.definition.groupColors) ?? [];
    colors[index] = color;
    this.props.updateChart(this.props.chartId, { groupColors: colors });
  }

  onPieHoleSizeChange(pieHolePercentage: number) {
    this.props.updateChart(this.props.chartId, {
      ...this.props.definition,
      pieHolePercentage,
    });
  }
}
