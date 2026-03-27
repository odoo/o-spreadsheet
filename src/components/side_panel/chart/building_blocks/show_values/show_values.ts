import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { ChartWithDataSetDefinition } from "../../../../../types";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../../common";

import { Component } from "../../../../../owl3_compatibility_layer";
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
