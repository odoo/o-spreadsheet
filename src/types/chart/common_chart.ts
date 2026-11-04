import { Color } from "../misc";
import { Range } from "../range";
import { AxesDesign, ChartColorScale, ChartDataSource, DataSetStyle, TitleDesign } from "./chart";

export type VerticalAxisPosition = "left" | "right";
export type LegendPosition = "top" | "bottom" | "left" | "right" | "none";

/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │                       BaseChartDefinition                   │
 * ├──────────────────┬─────────────────────┬────────────────────┤
 * │ DataSourceCharts │ NonDataSourceCharts │ HierarchicalCharts │
 * ├──────────────────┼─────────────────────┼────────────────────┤
 * │ bar              │ bubble              │ sunburst           │
 * │  ├ pyramid       │ gauge               │ treemap            │
 * │  └ column*       │ heatmap             │                    │
 * │ calendar         │ scorecard           │                    │
 * │ combo            │                     │                    │
 * │ funnel           │                     │                    │
 * │ geo              │                     │                    │
 * │ line             │                     │                    │
 * │  ├ scatter       │                     │                    │
 * │  └ area*         │                     │                    │
 * │ pie              │                     │                    │
 * │  └ doughnut*     │                     │                    │
 * │ radar            │                     │                    │
 * │ waterfall        │                     │                    │
 * └──────────────────┴─────────────────────┴────────────────────┘
 *  ├ / └ : distinct chart type extending its parent definition (Omit<Parent, ...>)
 *  *     : not a chart type, a subtype of its parent enabled by a flag
 *          (column = bar + !horizontal, area = line + fillArea, doughnut = pie + isDoughnut)
 */
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

export interface HierarchicalChartDefinition<T extends string | Range = Range>
  extends BaseChartDefinition {
  readonly dataSetStyles: DataSetStyle;
  readonly dataSource: ChartDataSource<T>;
  readonly showValues?: boolean;
  readonly showLabels?: boolean;
  readonly legendPosition: LegendPosition;
}

export interface ColorGridChartDefinition {
  readonly type: "calendar" | "heatmap";
  readonly colorScale?: ChartColorScale;
  readonly missingValueColor?: Color;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly showValues?: boolean;
  readonly axesDesign?: AxesDesign;
}
