import { ChartConfiguration } from "chart.js";
import { TitleDesign } from ".";
import { Color } from "../misc";

export interface TimeMatrixChartDefinition {
  readonly dataRange: string;
  readonly labelRange?: string;
  readonly title: TitleDesign;
  readonly background?: Color;
  readonly showValues?: boolean;
  readonly type: "timeMatrix";
  readonly colormap?: "turbo" | "magma" | "inferno" | "plasma" | "viridis" | "gray";
}

export type TimeMatrixChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
};
