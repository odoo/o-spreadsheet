import { Component } from "@odoo/owl";
import { ChartWithDataSetDefinition, SpreadsheetChildEnv } from "../../../../../types";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../../common";

export class ChartHumanizeNumbers extends Component<
  ChartSidePanelProps<ChartWithDataSetDefinition>,
  SpreadsheetChildEnv
> {
  static template = "o-spreadsheet-ChartHumanizeNumbers";
  static components = {
    Checkbox,
  };
  static props = ChartSidePanelPropsObject;
}
