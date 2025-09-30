import { Color } from "@odoo/o-spreadsheet-engine";
import { ChartConfiguration } from "chart.js";
import { BarChartDefinition } from "./bar_chart";

export interface PyramidChartDefinition extends Omit<BarChartDefinition, "type"> {
  readonly type: "pyramid";
}

export type PyramidChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
};
