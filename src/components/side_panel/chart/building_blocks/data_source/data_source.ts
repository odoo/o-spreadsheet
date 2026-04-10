import { Component } from "../../../../../owl3_compatibility_layer";
import { chartDataSourceSidePanelComponentRegistry } from "../../../../../registries/chart_data_source_component_registry";
import { ChartDefinitionWithDataSource, UID } from "../../../../../types";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { ChartSidePanelProps } from "../../common";
import { ChartDataSeries } from "../data_series/data_series";
import { ChartLabelRange } from "../label_range/label_range";

interface Props {
  chartId: UID;
  definition: ChartDefinitionWithDataSource<string>;
  updateChart: ChartSidePanelProps<ChartDefinitionWithDataSource<string>>["updateChart"];
  canUpdateChart: ChartSidePanelProps<ChartDefinitionWithDataSource<string>>["canUpdateChart"];
  onErrorMessagesChanged?: (errorMessages: string[]) => void;
  dataSeriesTitle?: string;
  labelRangeTitle?: string;
  getLabelRangeOptions?: () => Array<{
    name: string;
    label: string;
    value: boolean;
    onChange: (value: boolean) => void;
  }>;
}

export class ChartDataSourceComponent extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartDataSourceComponent";
  static components = {
    ChartDataSeries,
    ChartLabelRange,
  };
  static props = {
    chartId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: Function,
    onErrorMessagesChanged: { type: Function, optional: true },
    dataSeriesTitle: { type: String, optional: true },
    labelRangeTitle: { type: String, optional: true },
    getLabelRangeOptions: { type: Function, optional: true },
  };

  get DataSourceComponent() {
    const dataSourceType = this.props.definition.dataSource.type;
    return chartDataSourceSidePanelComponentRegistry.get(dataSourceType);
  }
}
