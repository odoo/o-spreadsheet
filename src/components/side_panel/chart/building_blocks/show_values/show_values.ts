import { Component } from "../../../../../owl3_compatibility_layer";
import { ChartDefinitionWithDataSource } from "../../../../../types";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../../common";

interface Props extends ChartSidePanelProps<ChartDefinitionWithDataSource<string>> {
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
