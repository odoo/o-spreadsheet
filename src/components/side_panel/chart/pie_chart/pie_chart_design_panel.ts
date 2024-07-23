import { Component } from "@odoo/owl";
import { DispatchResult, SpreadsheetChildEnv, UID } from "../../../../types";
import { PieChartDefinition } from "../../../../types/chart";
import { Checkbox } from "../../components/checkbox/checkbox";
import { Section } from "../../components/section/section";
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";
import { ChartLegend } from "../building_blocks/legend/legend";

interface Props {
  figureId: UID;
  definition: PieChartDefinition;
  canUpdateChart: (figureID: UID, definition: Partial<PieChartDefinition>) => DispatchResult;
  updateChart: (figureId: UID, definition: Partial<PieChartDefinition>) => DispatchResult;
}

export class PieChartDesignPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PieChartDesignPanel";
  static components = {
    GeneralDesignEditor,
    Section,
    Checkbox,
    ChartLegend,
  };
  static props = {
    figureId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: { type: Function, optional: true },
  };

  updateLegendPosition(ev) {
    this.props.updateChart(this.props.figureId, {
      legendPosition: ev.target.value,
    });
  }
}
