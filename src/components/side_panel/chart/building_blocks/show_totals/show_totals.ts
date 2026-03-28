import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component } from "@odoo/owl";
import { ChartWithDataSetDefinition } from "../../../../../types";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../../common";

interface Props extends ChartSidePanelProps<ChartWithDataSetDefinition> {}

export class ChartShowTotals extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartShowTotals";
  static components = {
    Checkbox,
  };
  static props = ChartSidePanelPropsObject;
}
