import type { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { CustomizedDataSet, TitleDesign } from "./chart";
import { LegendPosition } from "./common_chart";

export interface PieChartDefinition {
  readonly type: "pie";
  readonly dataSets: CustomizedDataSet[];
  readonly dataSetsHaveTitle: boolean;
  readonly labelRange?: string;
  readonly title: TitleDesign;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly aggregated?: boolean;
  readonly isDoughnut?: boolean;
  readonly showValues?: boolean;
  readonly pieHolePercentage?: number;
}

export type PieChartRuntime = {
  chartJsConfig: ChartConfiguration<"pie" | "doughnut">;
  background: Color;
};
