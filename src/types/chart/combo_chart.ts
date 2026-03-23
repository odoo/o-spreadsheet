import { ChartConfiguration } from "chart.js";
import { UID } from "../misc";
import { Range } from "../range";
import { CustomizedDataSet } from "./chart";
import { CommonChartDefinition } from "./common_chart";

export interface ComboChartDefinition<T extends string | Range = Range>
  extends CommonChartDefinition<T> {
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
