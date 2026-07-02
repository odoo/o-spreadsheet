import { ChartConfiguration } from "chart.js";
import { Range } from "../range";
import { ColorScaleGridChartDefinition, NonDataSourceBaseChartDefinition } from "./common_chart";

export interface HeatmapChartDefinition<T extends string | Range = Range>
  extends NonDataSourceBaseChartDefinition,
    ColorScaleGridChartDefinition {
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
