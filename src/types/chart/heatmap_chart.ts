import { ChartConfiguration } from "chart.js";
import { Range } from "../range";
import { ColorGridChartDefinition, NonDataSourceBaseChartDefinition } from "./common_chart";

export interface HeatmapChartDefinition<T extends string | Range = Range>
  extends NonDataSourceBaseChartDefinition,
    ColorGridChartDefinition {
  readonly type: "heatmap";
  readonly rowRange?: T;
  readonly columnRange?: T;
  readonly dataRange?: T;
  /** If true, the first cell of each range is a header and is excluded from the data. */
  readonly dataSetsHaveTitle: boolean;
}

export type HeatmapChartRuntime = {
  chartJsConfig: ChartConfiguration;
};
