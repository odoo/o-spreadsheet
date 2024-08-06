import { Component } from "@odoo/owl";
import {
  ChartWithAxisDefinition,
  DispatchResult,
  SpreadsheetChildEnv,
  UID,
} from "../../../../../types";
import { Section } from "../../../components/section/section";

interface Props {
  figureId: UID;
  definition: ChartWithAxisDefinition;
  canUpdateChart: (figureID: UID, definition: Partial<ChartWithAxisDefinition>) => DispatchResult;
  updateChart: (figureId: UID, definition: Partial<ChartWithAxisDefinition>) => DispatchResult;
}

export class LegendComponent extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-LegendComponent";
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
