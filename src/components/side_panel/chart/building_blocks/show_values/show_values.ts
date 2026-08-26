import { useProps } from "@odoo/owl";
import { ChartDefinitionWithDataSource } from "../../../../../types/chart/chart";
import { DispatchResult } from "../../../../../types/commands";
import { UID } from "../../../../../types/misc";
import { types } from "../../../../props_validation";
import { SpreadsheetComponent } from "../../../../spreadsheet/spreadsheet_component";
import { Checkbox } from "../../../components/checkbox/checkbox";

export class ChartShowValues extends SpreadsheetComponent {
  static template = "o-spreadsheet-ChartShowValues";
  static components = {
    Checkbox,
  };

  protected props = useProps({
    chartId: types.UID(),
    definition: types.ChartDefinitionWithDataSource(),
    canUpdateChart:
      types.function<
        (chartId: UID, definition: Partial<ChartDefinitionWithDataSource<string>>) => DispatchResult
      >(),
    updateChart:
      types.function<
        (chartId: UID, definition: Partial<ChartDefinitionWithDataSource<string>>) => DispatchResult
      >(),
    defaultValue: types.boolean().optional(),
  });
}
