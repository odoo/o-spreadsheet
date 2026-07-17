import { ChartDefinitionWithDataSource } from "../../../../../types/chart/chart";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { ChartSidePanelProps, chartSidePanelPropsDefinition } from "../../common";

import { useProps } from "@odoo/owl";
import { Component } from "../../../../../owl3_compatibility_layer";
export class ChartShowDataMarkers extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartShowDataMarkers";
  static components = {
    Checkbox,
  };
  protected props = useProps(chartSidePanelPropsDefinition) as unknown as ChartSidePanelProps<
    ChartDefinitionWithDataSource<string>
  >;
}
