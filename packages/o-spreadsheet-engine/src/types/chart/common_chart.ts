import { Color } from "../misc";
import { Range } from "../range";
import { AxesDesign, ChartRangeDataSource, DataSetStyle, TitleDesign } from "./chart";

export type VerticalAxisPosition = "left" | "right";
export type LegendPosition = "top" | "bottom" | "left" | "right" | "none";

export interface CommonChartDefinition<T extends string | Range = Range> {
  readonly dataSetStyles: DataSetStyle;
  readonly dataSource: ChartRangeDataSource<T>;
  readonly title: TitleDesign;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly aggregated?: boolean;
  readonly axesDesign?: AxesDesign;
  readonly showValues?: boolean;
  readonly humanize?: boolean;
}
