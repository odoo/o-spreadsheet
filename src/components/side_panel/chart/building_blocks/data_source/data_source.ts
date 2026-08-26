import { useProps } from "@odoo/owl";
import { chartDataSourceSidePanelComponentRegistry } from "../../../../../registries/chart_data_source_component_registry";
import { ChartDefinitionWithDataSource } from "../../../../../types/chart/chart";
import { types } from "../../../../props_validation";
import { SpreadsheetComponent } from "../../../../spreadsheet/spreadsheet_component";
import { ChartUpdateFunction } from "../../common";
import { ChartDataSeries } from "../data_series/data_series";
import { ChartLabelRange } from "../label_range/label_range";

export class ChartDataSourceComponent extends SpreadsheetComponent {
  static template = "o-spreadsheet-ChartDataSourceComponent";
  static components = {
    ChartDataSeries,
    ChartLabelRange,
  };

  protected props = useProps({
    chartId: types.UID(),
    definition: types.ChartDefinitionWithDataSource(),
    updateChart: types.function<ChartUpdateFunction<ChartDefinitionWithDataSource<string>>>(),
    canUpdateChart: types.function<ChartUpdateFunction<ChartDefinitionWithDataSource<string>>>(),
    dataSeriesTitle: types.string().optional(),
    labelRangeTitle: types.string().optional(),
    getLabelRangeOptions: types
      .function<
        () => Array<{
          name: string;
          label: string;
          value: boolean;
          onChange: (value: boolean) => void;
        }>
      >()
      .optional(),
  });

  get DataSourceComponent() {
    const dataSourceType = this.props.definition.dataSource.type;
    return chartDataSourceSidePanelComponentRegistry.get(dataSourceType);
  }
}
