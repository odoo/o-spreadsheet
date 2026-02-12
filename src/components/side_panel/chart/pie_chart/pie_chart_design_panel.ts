import { deepCopy } from "@odoo/o-spreadsheet-engine";
import { PieChartDefinition, PieChartRuntime } from "@odoo/o-spreadsheet-engine/types/chart";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { DEFAULT_DOUGHNUT_CHART_HOLE_SIZE } from "@odoo/o-spreadsheet-engine/xlsx/constants";
import { Component, useState } from "@odoo/owl";
import { Checkbox } from "../../components/checkbox/checkbox";
import { SidePanelCollapsible } from "../../components/collapsible/side_panel_collapsible";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { Section } from "../../components/section/section";
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";
import { ChartHumanizeNumbers } from "../building_blocks/humanize_numbers/humanize_numbers";
import { ChartLegend } from "../building_blocks/legend/legend";
import { PieHoleSize } from "../building_blocks/pie_hole_size/pie_hole_size";
import { ChartShowValues } from "../building_blocks/show_values/show_values";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../common";

export class PieChartDesignPanel extends Component<
  ChartSidePanelProps<PieChartDefinition>,
  SpreadsheetChildEnv
> {
  static template = "o-spreadsheet-PieChartDesignPanel";
  static components = {
    GeneralDesignEditor,
    Section,
    ChartLegend,
    ChartShowValues,
    PieHoleSize,
    Checkbox,
    ChartHumanizeNumbers,
    SidePanelCollapsible,
    RoundColorPicker,
  };
  static props = ChartSidePanelPropsObject;

  protected state = useState({ index: 0 });

  get runtime() {
    return this.env.model.getters.getChartRuntime(this.props.chartId) as PieChartRuntime;
  }

  isLegendDisabled() {
    return !this.props.definition.labelRange;
  }

  getLabels() {
    let labels = this.runtime.chartJsConfig.data.labels;
    labels = labels?.map((label, index) => (label === "" ? `Slice ${index + 1}` : label));
    return labels;
  }

  onPieHoleSizeChange(pieHolePercentage: number) {
    this.props.updateChart(this.props.chartId, {
      ...this.props.definition,
      pieHolePercentage,
    });
  }
  get defaultHoleSize() {
    return DEFAULT_DOUGHNUT_CHART_HOLE_SIZE;
  }

  updateEditedValues(ev: Event) {
    this.state.index = (ev.target as HTMLSelectElement).selectedIndex;
  }

  updateSliceColor(color: string) {
    let slicesColors = deepCopy(this.props.definition.slicesColors);
    if (!slicesColors) {
      slicesColors = Array(this.getLabels()?.length).fill("");
    }
    slicesColors[this.state.index] = color;
    this.props.updateChart(this.props.chartId, {
      ...this.props.definition,
      slicesColors,
    });
  }

  getSliceColor() {
    const slicesColors = this.props.definition.slicesColors;
    if (slicesColors?.[this.state.index]) {
      return slicesColors?.[this.state.index];
    }
    const dataSets = this.runtime.chartJsConfig.data.datasets;
    const color = dataSets[0]?.backgroundColor?.[this.state.index];
    return color;
  }
}
