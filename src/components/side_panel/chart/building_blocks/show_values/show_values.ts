import { Component } from "@odoo/owl";
import { ChartWithDataSetDefinition, SpreadsheetChildEnv } from "../../../../../types";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../../common";

interface Props extends ChartSidePanelProps<ChartWithDataSetDefinition> {
  defaultValue?: boolean;
}

export class ChartShowValues extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartShowValues";
  static components = {
    Checkbox,
  };
  static props = {
    ...ChartSidePanelPropsObject,
    defaultValue: { type: Boolean, optional: true },
  };
}
