import { GenericDefinition, PieChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart";
import { DEFAULT_DOUGHNUT_CHART_HOLE_SIZE } from "@odoo/o-spreadsheet-engine/xlsx/constants";
import { Component } from "@odoo/owl";
import { DispatchResult, SpreadsheetChildEnv, UID } from "../../../../types";
import { Checkbox } from "../../components/checkbox/checkbox";
import { Section } from "../../components/section/section";
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";
import { ChartHumanizeNumbers } from "../building_blocks/humanize_numbers/humanize_numbers";
import { ChartLegend } from "../building_blocks/legend/legend";
import { PieHoleSize } from "../building_blocks/pie_hole_size/pie_hole_size";
import { ChartShowValues } from "../building_blocks/show_values/show_values";

interface Props {
  chartId: UID;
  definition: PieChartDefinition;
  canUpdateChart: (
    chartId: UID,
    definition: GenericDefinition<PieChartDefinition>
  ) => DispatchResult;
  updateChart: (chartId: UID, definition: GenericDefinition<PieChartDefinition>) => DispatchResult;
}

export class PieChartDesignPanel extends Component<Props, SpreadsheetChildEnv> {
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
  static props = {
    chartId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: { type: Function, optional: true },
  };

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
