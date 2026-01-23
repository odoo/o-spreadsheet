import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component } from "@odoo/owl";
import { ChartDefinitionWithDataSource } from "../../../../../types";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../../common";

export class ChartShowDataMarkers extends Component<
  ChartSidePanelProps<ChartDefinitionWithDataSource<string>>,
  SpreadsheetChildEnv
> {
  static template = "o-spreadsheet-ChartShowDataMarkers";
  static components = {
    Checkbox,
  };
  static props = ChartSidePanelPropsObject;
}
