import { Color } from "../misc";
import { Range } from "../range";
import { AxesDesign, ChartDataSource, DataSetStyle, TitleDesign } from "./chart";

export type VerticalAxisPosition = "left" | "right";
export type LegendPosition = "top" | "bottom" | "left" | "right" | "none";

export interface CommonChartDefinition<T extends string | Range = Range> {
  readonly dataSetStyles: DataSetStyle;
  readonly dataSource: ChartDataSource<T>;
  readonly title: TitleDesign;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly aggregated?: boolean;
  readonly axesDesign?: AxesDesign;
  readonly showValues?: boolean;
  readonly humanize?: boolean;
}

export interface NonDataSourceBaseChartDefinition {
  readonly title: TitleDesign;
  readonly background?: Color;
  readonly humanize?: boolean;
  readonly dataSource?: undefined; // doesn't use a data source. Explicitly declaring the key ensures that `dataSource` can be safely accessed on the `ChartDefinition` union without TypeScript errors.
}
