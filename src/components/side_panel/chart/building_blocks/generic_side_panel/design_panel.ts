import { Component } from "@odoo/owl";
import { ChartDefinition, DispatchResult, SpreadsheetChildEnv, UID } from "../../../../../types";
import { GeneralDesignEditor } from "../general_design/general_design_editor";

interface Props {
  figureId: UID;
  definition: ChartDefinition;
  canUpdateChart: (figureID: UID, definition: Partial<ChartDefinition>) => DispatchResult;
  updateChart: (figureId: UID, definition: Partial<ChartDefinition>) => DispatchResult;
}

export class GenericChartDesignPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GenericChartDesignPanel";
  static components = {
    GeneralDesignEditor,
  };
  static props = {
    figureId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: { type: Function, optional: true },
  };
}
