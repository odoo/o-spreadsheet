import { ChartDefinitionWithDataSource } from "../../../../../types/chart/chart";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { ChartSidePanelProps, chartSidePanelPropsDefinition } from "../../common";

import { useProps } from "@odoo/owl";
import { SpreadsheetComponent } from "../../../../spreadsheet/spreadsheet_component";
export class ChartShowDataMarkers extends SpreadsheetComponent {
  static template = "o-spreadsheet-ChartShowDataMarkers";
  static components = {
    Checkbox,
  };
  protected props = useProps(chartSidePanelPropsDefinition) as unknown as ChartSidePanelProps<
    ChartDefinitionWithDataSource<string>
  >;
}
