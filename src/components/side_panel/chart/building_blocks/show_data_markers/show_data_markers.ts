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
}

export class ChartShowDataMarkers extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartShowDataMarkers";
  static components = {
    Checkbox,
  };
  static props = {
    figureId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: Function,
  };
}
