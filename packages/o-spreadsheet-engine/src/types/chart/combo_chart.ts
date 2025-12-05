import { ChartConfiguration } from "chart.js";
import { UID } from "../misc";
import { CustomizedDataSet } from "./chart";
import { CommonChartDefinition } from "./common_chart";

export interface ComboChartDefinition extends CommonChartDefinition {
  readonly dataSetStyles: ComboChartDataSetStyle;
  readonly type: "combo";
  readonly hideDataMarkers?: boolean;
  readonly zoomable?: boolean;
}

export type ComboChartDataSetStyle = Record<UID, CustomizedDataSet & { type?: "bar" | "line" }>;

export type ComboChartRuntime = {
  chartJsConfig: ChartConfiguration;
  masterChartConfig?: ChartConfiguration;
  customisableSeries: { dataSetId: string; label: string }[];
};
