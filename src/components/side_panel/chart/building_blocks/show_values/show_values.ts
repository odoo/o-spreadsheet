import { Component } from "@odoo/owl";
import {
  ChartWithDataSetDefinition,
  DispatchResult,
  SpreadsheetChildEnv,
  UID,
} from "../../../../../types";
import { Checkbox } from "../../../components/checkbox/checkbox";

interface Props {
  figureId: UID;
  definition: ChartWithDataSetDefinition;
  updateChart: (figureId: UID, definition: Partial<ChartWithDataSetDefinition>) => DispatchResult;
  canUpdateChart: (
    figureId: UID,
    definition: Partial<ChartWithDataSetDefinition>
  ) => DispatchResult;
  defaultValue?: boolean;
}

export class ChartShowValues extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartShowValues";
  static components = {
    Checkbox,
  };
  static props = {
    figureId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: Function,
    defaultValue: { type: Boolean, optional: true },
  };
}
