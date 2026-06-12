import { props } from "@odoo/owl";
import { Component } from "../../../../../owl3_compatibility_layer";
import { ChartDefinitionWithDataSource } from "../../../../../types/chart/chart";
import { DispatchResult } from "../../../../../types/commands";
import { UID } from "../../../../../types/misc";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { types } from "../../../../props_validation";
import { Checkbox } from "../../../components/checkbox/checkbox";

export class ChartShowValues extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartShowValues";
  static components = {
    Checkbox,
  };

  protected props = props({
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
