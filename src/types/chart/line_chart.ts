import { Color } from "@odoo/o-spreadsheet-engine";
import type { ChartConfiguration } from "chart.js";
import { CommonChartDefinition } from "./common_chart";

export interface LineChartDefinition extends CommonChartDefinition {
  readonly type: "line";
  readonly labelsAsText: boolean;
  readonly stacked: boolean;
  readonly aggregated?: boolean;
  readonly cumulative: boolean;
  readonly fillArea?: boolean;
  readonly hideDataMarkers?: boolean;
  readonly zoomable?: boolean;
}

export type LineChartRuntime = {
  chartJsConfig: ChartConfiguration;
  masterChartConfig?: ChartConfiguration;
  background: Color;
};
