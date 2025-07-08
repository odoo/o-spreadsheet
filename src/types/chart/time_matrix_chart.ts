import { ChartConfiguration } from "chart.js";
import { AxesDesign, TitleDesign } from ".";
import { ColorScale } from "../../helpers/figures/charts/colormap";
import { Color } from "../misc";

export interface TimeMatrixChartDefinition {
  readonly dataRange: string;
  readonly labelRange?: string;
  readonly title: TitleDesign;
  readonly background?: Color;
  readonly showValues?: boolean;
  readonly type: "timeMatrix";
  readonly colormap?: ColorScale;
  readonly axesDesign?: AxesDesign;
}

export type TimeMatrixChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
};
