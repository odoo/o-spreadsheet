import { Color } from "../misc";
import { AxesDesign, ChartRangeDataSource, DataSetStyle, TitleDesign } from "./chart";

export type VerticalAxisPosition = "left" | "right";
export type LegendPosition = "top" | "bottom" | "left" | "right" | "none";

export interface CommonChartDefinition {
  readonly dataSetStyles: DataSetStyle;
  readonly dataSource: ChartRangeDataSource;
  readonly dataSetsHaveTitle: boolean;
  readonly labelRange?: string;
  readonly title: TitleDesign;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly aggregated?: boolean;
  readonly axesDesign?: AxesDesign;
  readonly showValues?: boolean;
  readonly humanize?: boolean;
}
