import { ChartDefinitionWithDataSource } from "../../../../../types/chart/chart";
import { OSComponent } from "../../../../os_component";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { ChartSidePanelProps, chartSidePanelPropsDefinition } from "../../common";

import { useProps } from "@odoo/owl";
export class ChartShowDataMarkers extends OSComponent {
  static template = "o-spreadsheet-ChartShowDataMarkers";
  static components = {
    Checkbox,
  };
  protected props = useProps(chartSidePanelPropsDefinition) as unknown as ChartSidePanelProps<
    ChartDefinitionWithDataSource<string>
  >;
}
