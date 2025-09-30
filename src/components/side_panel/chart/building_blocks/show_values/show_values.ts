import { UID } from "@odoo/o-spreadsheet-engine";
import { Component } from "@odoo/owl";
import {
  ChartWithDataSetDefinition,
  DispatchResult,
  SpreadsheetChildEnv,
} from "../../../../../types";
import { Checkbox } from "../../../components/checkbox/checkbox";

interface Props {
  chartId: UID;
  definition: ChartWithDataSetDefinition;
  updateChart: (chartId: UID, definition: Partial<ChartWithDataSetDefinition>) => DispatchResult;
  canUpdateChart: (chartId: UID, definition: Partial<ChartWithDataSetDefinition>) => DispatchResult;
  defaultValue?: boolean;
}

export class ChartShowValues extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartShowValues";
  static components = {
    Checkbox,
  };
  static props = {
    chartId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: Function,
    defaultValue: { type: Boolean, optional: true },
  };
}
