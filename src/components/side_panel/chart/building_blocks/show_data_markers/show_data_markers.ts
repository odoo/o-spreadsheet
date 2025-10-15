import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component } from "@odoo/owl";
import { ChartWithDataSetDefinition, DispatchResult, UID } from "../../../../../types";
import { Checkbox } from "../../../components/checkbox/checkbox";

interface Props {
  chartId: UID;
  definition: ChartWithDataSetDefinition;
  updateChart: (chartId: UID, definition: Partial<ChartWithDataSetDefinition>) => DispatchResult;
  canUpdateChart: (chartId: UID, definition: Partial<ChartWithDataSetDefinition>) => DispatchResult;
}

export class ChartShowDataMarkers extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartShowDataMarkers";
  static components = {
    Checkbox,
  };
  static props = {
    chartId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: Function,
  };
}
