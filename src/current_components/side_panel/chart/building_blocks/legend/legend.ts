import { Component } from "@odoo/owl";
import {
  ChartWithDataSetDefinition,
  DispatchResult,
  SpreadsheetChildEnv,
  UID,
} from "../../../../../types";
import { Section } from "../../../components/section/section";

interface Props {
  figureId: UID;
  definition: ChartWithDataSetDefinition;
  updateChart: (figureId: UID, definition: Partial<ChartWithDataSetDefinition>) => DispatchResult;
}

export class ChartLegend extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartLegend";
  static components = {
    Section,
  };
  static props = {
    figureId: String,
    definition: Object,
    updateChart: Function,
  };

  updateLegendPosition(ev) {
    this.props.updateChart(this.props.figureId, {
      legendPosition: ev.target.value,
    });
  }
}
