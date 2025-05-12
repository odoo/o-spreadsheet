import type { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { CommonChartDefinition, VerticalAxisPosition } from "./common_chart";

export interface WaterfallChartDefinition extends CommonChartDefinition {
  readonly type: "waterfall";
  readonly verticalAxisPosition: VerticalAxisPosition;
  readonly aggregated?: boolean;
  readonly showSubTotals: boolean;
  readonly showConnectorLines: boolean;
  readonly firstValueAsSubtotal?: boolean;
  readonly positiveValuesColor?: Color;
  readonly negativeValuesColor?: Color;
  readonly subTotalValuesColor?: Color;
}

export type WaterfallChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
};
