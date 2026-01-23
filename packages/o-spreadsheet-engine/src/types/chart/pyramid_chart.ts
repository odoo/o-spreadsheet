import { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { Range } from "../range";
import { BarChartDefinition } from "./bar_chart";

export interface PyramidChartDefinition<T extends string | Range = Range>
  extends Omit<BarChartDefinition<T>, "type" | "zoomable"> {
  readonly type: "pyramid";
}

export type PyramidChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
  customisableSeries: { dataSetId: string; label: string }[];
};
