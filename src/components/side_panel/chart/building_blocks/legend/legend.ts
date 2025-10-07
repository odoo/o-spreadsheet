import { Component } from "@odoo/owl";
import { ChartWithDataSetDefinition, DispatchResult, UID } from "../../../../../types";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheetChildEnv";
import { Section } from "../../../components/section/section";

interface Props {
  chartId: UID;
  definition: ChartWithDataSetDefinition;
  updateChart: (chartId: UID, definition: Partial<ChartWithDataSetDefinition>) => DispatchResult;
  canUpdateChart: (chartId: UID, definition: Partial<ChartWithDataSetDefinition>) => DispatchResult;
}

export class ChartLegend extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartLegend";
  static components = {
    Section,
  };
  static props = {
    chartId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: Function,
  };

  updateLegendPosition(ev) {
    this.props.updateChart(this.props.chartId, {
      legendPosition: ev.target.value,
    });
  }
}
