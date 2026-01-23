import { ChartConfiguration } from "chart.js";
import { Color, UID } from "../misc";
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
  background: Color;
  customisableSeries: { dataSetId: string; label: string }[];
};
