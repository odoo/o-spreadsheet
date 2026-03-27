import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { ChartWithDataSetDefinition } from "../../../../../types";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../../common";

import { Component } from "../../../../../owl3_compatibility_layer";
export class ChartShowDataMarkers extends Component<
  ChartSidePanelProps<ChartWithDataSetDefinition>,
  SpreadsheetChildEnv
> {
  static template = "o-spreadsheet-ChartShowDataMarkers";
  static components = {
    Checkbox,
  };
  static props = ChartSidePanelPropsObject;
}
