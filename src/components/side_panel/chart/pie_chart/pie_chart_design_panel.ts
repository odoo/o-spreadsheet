import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../types";
import { PieChartDefinition } from "../../../../types/chart";
import { DEFAULT_DOUGHNUT_CHART_HOLE_SIZE } from "../../../../xlsx/constants";
import { Checkbox } from "../../components/checkbox/checkbox";
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
  };
  static props = ChartSidePanelPropsObject;

  onPieHoleSizeChange(pieHolePercentage: number) {
    this.props.updateChart(this.props.chartId, {
      ...this.props.definition,
      pieHolePercentage,
    });
  }
  get defaultHoleSize() {
    return DEFAULT_DOUGHNUT_CHART_HOLE_SIZE;
  }
}
