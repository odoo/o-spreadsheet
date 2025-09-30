import { Component } from "@odoo/owl";
import { ChartWithDataSetDefinition, SpreadsheetChildEnv } from "../../../../../types";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../../common";

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
