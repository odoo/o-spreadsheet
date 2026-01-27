import { Component, useState } from "@odoo/owl";
import { deepCopy } from "../../../../helpers";
import { ValueAndLabel } from "../../../../types";
import { PieChartDefinition, PieChartRuntime } from "../../../../types/chart";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { DEFAULT_DOUGHNUT_CHART_HOLE_SIZE } from "../../../../xlsx/constants";
import { Select } from "../../../select/select";
import { Checkbox } from "../../components/checkbox/checkbox";
import { SidePanelCollapsible } from "../../components/collapsible/side_panel_collapsible";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { Section } from "../../components/section/section";
import { ChartAnnotation } from "../building_blocks/annotation/annotation";
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";
import { ChartHumanizeNumbers } from "../building_blocks/humanize_numbers/humanize_numbers";
import { ChartLegend } from "../building_blocks/legend/legend";
import { PieHoleSize } from "../building_blocks/pie_hole_size/pie_hole_size";
import { ChartShowValues } from "../building_blocks/show_values/show_values";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../common";

export class PieChartDesignPanel extends Component<
  ChartSidePanelProps<PieChartDefinition<string>>,
  SpreadsheetChildEnv
> {
  static template = "o-spreadsheet-PieChartDesignPanel";
  static components = {
    GeneralDesignEditor,
    ChartAnnotation,
    Section,
    ChartLegend,
    ChartShowValues,
    PieHoleSize,
    Checkbox,
    ChartHumanizeNumbers,
    SidePanelCollapsible,
    RoundColorPicker,
    Select,
  };
  static props = ChartSidePanelPropsObject;

  protected state = useState({ index: 0 });

  get runtime() {
    return this.env.model.getters.getChartRuntime(this.props.chartId) as PieChartRuntime;
  }

  get isLegendDisabled() {
    const labels = this.runtime.chartJsConfig.data.labels;
    return !labels || labels.every((label) => label === "");
  }

  get labels(): string[] {
    const labels = this.runtime.chartJsConfig.data.labels as string[] | undefined;
    return labels?.map((label, index) => (label === "" ? `Slice ${index + 1}` : label)) || [];
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

  updateEditedValues(selectedIndex: string) {
    this.state.index = parseInt(selectedIndex);
  }

  updateSliceColor(color: string) {
    let slicesColors = deepCopy(this.props.definition.slicesColors);
    if (!slicesColors) {
      slicesColors = Array(this.labels?.length).fill("");
    }
    slicesColors[this.state.index] = color;
    this.props.updateChart(this.props.chartId, {
      ...this.props.definition,
      slicesColors,
    });
  }

  get sliceColor() {
    const slicesColors = this.props.definition.slicesColors;
    if (slicesColors?.[this.state.index]) {
      return slicesColors?.[this.state.index];
    }
    const dataSets = this.runtime.chartJsConfig.data.datasets;
    const color = dataSets[0]?.backgroundColor?.[this.state.index];
    return color;
  }

  get pieSliceOptions(): ValueAndLabel[] {
    return this.labels.map((label, index) => ({
      value: index.toString(),
      label,
    }));
  }
}
