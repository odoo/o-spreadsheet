import { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { Range } from "../range";
import { DataSourceChartDefinition, VerticalAxisPosition } from "./common_chart";

export interface WaterfallChartDefinition<T extends string | Range = Range>
  extends DataSourceChartDefinition<T> {
  readonly type: "waterfall";
  readonly verticalAxisPosition: VerticalAxisPosition;
  readonly aggregated?: boolean;
  readonly showSubTotals: boolean;
  readonly showConnectorLines: boolean;
  readonly firstValueAsSubtotal?: boolean;
  readonly positiveValuesColor?: Color;
  readonly negativeValuesColor?: Color;
  readonly subTotalValuesColor?: Color;
  readonly zoomable?: boolean;
}

export type WaterfallChartRuntime = {
  chartJsConfig: ChartConfiguration;
};
