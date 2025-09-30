import { ChartConfiguration } from "chart.js";
import { CommonChartDefinition } from ".";

import { Color } from "@odoo/o-spreadsheet-engine";

export interface BarChartDefinition extends CommonChartDefinition {
  readonly type: "bar";
  readonly stacked: boolean;
  readonly horizontal?: boolean;
  readonly zoomable?: boolean;
}

export type BarChartRuntime = {
  chartJsConfig: ChartConfiguration;
  masterChartConfig?: ChartConfiguration;
  background: Color;
};
