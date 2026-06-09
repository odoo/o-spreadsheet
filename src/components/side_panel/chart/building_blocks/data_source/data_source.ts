import { props } from "@odoo/owl";
import { Component } from "../../../../../owl3_compatibility_layer";
import { chartDataSourceSidePanelComponentRegistry } from "../../../../../registries/chart_data_source_component_registry";
import { ChartDefinitionWithDataSource } from "../../../../../types/chart/chart";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { types } from "../../../../props_validation";
import { ChartUpdateFunction } from "../../common";
import { ChartDataSeries } from "../data_series/data_series";
import { ChartLabelRange } from "../label_range/label_range";

export class ChartDataSourceComponent extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartDataSourceComponent";
  static components = {
    ChartDataSeries,
    ChartLabelRange,
  };

  protected props = props({
    chartId: types.UID(),
    definition: types.ChartDefinitionWithDataSource(),
    updateChart: types.function<ChartUpdateFunction<ChartDefinitionWithDataSource<string>>>(),
    canUpdateChart: types.function<ChartUpdateFunction<ChartDefinitionWithDataSource<string>>>(),
    "dataSeriesTitle?": types.string(),
    "labelRangeTitle?": types.string(),
    "getLabelRangeOptions?": types.function as unknown as () => Array<{
      name: string;
      label: string;
      value: boolean;
      onChange: (value: boolean) => void;
    }>,
  });

  get DataSourceComponent() {
    const dataSourceType = this.props.definition.dataSource.type;
    return chartDataSourceSidePanelComponentRegistry.get(dataSourceType);
  }
}
