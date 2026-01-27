import { ChartConfiguration } from "chart.js";
import { UID } from "../misc";
import { Range } from "../range";
import { CustomizedDataSet } from "./chart";
import { DataSourceChartDefinition } from "./common_chart";

export interface ComboChartDefinition<T extends string | Range = Range>
  extends DataSourceChartDefinition<T> {
  readonly dataSetStyles: ComboChartDataSetStyle;
  readonly type: "combo";
  readonly hideDataMarkers?: boolean;
  readonly zoomable?: boolean;
}

export type ComboChartDataSetStyle = Record<UID, CustomizedDataSet & { type?: "bar" | "line" }>;

export type ComboChartRuntime = {
  chartJsConfig: ChartConfiguration;
  masterChartConfig?: ChartConfiguration;
  customizableSeries: { dataSetId: string; label: string }[];
};
