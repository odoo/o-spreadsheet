import type { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { AxesDesign, CustomizedDataSet, TitleDesign } from "./chart";
import { LegendPosition, VerticalAxisPosition } from "./common_chart";

export interface WaterfallChartDefinition {
  readonly type: "waterfall";
  readonly dataSets: CustomizedDataSet[];
  readonly dataSetsHaveTitle: boolean;
  readonly labelRange?: string;
  readonly title: TitleDesign;
  readonly background?: Color;
  readonly verticalAxisPosition: VerticalAxisPosition;
  readonly legendPosition: LegendPosition;
  readonly aggregated?: boolean;
  readonly showSubTotals: boolean;
  readonly showConnectorLines: boolean;
  readonly firstValueAsSubtotal?: boolean;
  readonly positiveValuesColor?: Color;
  readonly negativeValuesColor?: Color;
  readonly subTotalValuesColor?: Color;
  readonly axesDesign?: AxesDesign;
  readonly showValues?: boolean;
}

export type WaterfallChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
};
