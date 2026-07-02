import { Color } from "../misc";
import { Range } from "../range";
import { AxesDesign, ChartColorScale, ChartDataSource, DataSetStyle, TitleDesign } from "./chart";

export type VerticalAxisPosition = "left" | "right";
export type LegendPosition = "top" | "bottom" | "left" | "right" | "none";

/* All charts have these properties. */
export interface BaseChartDefinition {
  readonly title: TitleDesign;
  readonly background?: Color;
  readonly annotationText?: string;
  readonly annotationLink?: string;
  readonly humanize?: boolean;
}

export interface DataSourceChartDefinition<T extends string | Range = Range>
  extends BaseChartDefinition {
  readonly dataSetStyles: DataSetStyle;
  readonly dataSource: ChartDataSource<T>;
  readonly legendPosition: LegendPosition;
  readonly aggregated?: boolean;
  readonly axesDesign?: AxesDesign;
  readonly showValues?: boolean;
}

export interface NonDataSourceBaseChartDefinition extends BaseChartDefinition {
  readonly dataSource?: undefined; // doesn't use a data source. Explicitly declaring the key ensures that `dataSource` can be safely accessed on the `ChartDefinition` union without TypeScript errors.
}

/**
 * Shape shared by charts rendered as a bar-based grid colored with a color scale
 * (calendar, heatmap), used by their common runtime helpers.
 */
export interface ColorScaleGridChartDefinition {
  readonly colorScale?: ChartColorScale;
  readonly missingValueColor?: Color;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly showValues?: boolean;
  readonly axesDesign?: AxesDesign;
}
