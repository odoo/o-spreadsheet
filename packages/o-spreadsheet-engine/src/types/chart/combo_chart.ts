import { ChartConfiguration } from "chart.js";
import { Color, UID } from "../misc";
import { CustomizedDataSet } from "./chart";
import { CommonChartDefinition } from "./common_chart";

export interface ComboChartDefinition extends CommonChartDefinition {
  readonly dataSets: ComboChartDataSetStyling;
  readonly type: "combo";
  readonly hideDataMarkers?: boolean;
  readonly zoomable?: boolean;
}

export type ComboChartDataSetStyling = Record<UID, CustomizedDataSet & { type?: "bar" | "line" }>;

export type ComboChartRuntime = {
  chartJsConfig: ChartConfiguration;
  masterChartConfig?: ChartConfiguration;
  background: Color;
  customisableSeries: { dataSetId: string; label: string }[];
};
