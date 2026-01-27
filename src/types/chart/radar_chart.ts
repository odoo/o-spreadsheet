import { ChartConfiguration } from "chart.js";
import { Range } from "../range";
import { DataSourceChartDefinition } from "./common_chart";

export interface RadarChartDefinition<T extends string | Range = Range>
  extends DataSourceChartDefinition<T> {
  readonly type: "radar";
  readonly aggregated?: boolean;
  readonly stacked: boolean;
  readonly fillArea?: boolean;
  readonly hideDataMarkers?: boolean;
  readonly humanize?: boolean;
}

export type RadarChartRuntime = {
  chartJsConfig: ChartConfiguration;
  customizableSeries: { dataSetId: string; label: string }[];
};
