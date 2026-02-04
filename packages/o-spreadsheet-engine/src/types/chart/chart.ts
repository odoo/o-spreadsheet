import { Point } from "chart.js";
import { XlsxHexColor } from "../xlsx";
import { BarChartDefinition, BarChartRuntime } from "./bar_chart";
import { CalendarChartDefinition } from "./calendar_chart";
import { ComboChartDefinition, ComboChartRuntime } from "./combo_chart";
import { LegendPosition } from "./common_chart";
import { FunnelChartColors, FunnelChartDefinition, FunnelChartRuntime } from "./funnel_chart";
import { GaugeChartDefinition, GaugeChartRuntime } from "./gauge_chart";
import { GeoChartDefinition, GeoChartRuntime } from "./geo_chart";
import { LineChartDefinition, LineChartRuntime } from "./line_chart";
import { PieChartDefinition, PieChartRuntime } from "./pie_chart";
import { PyramidChartDefinition, PyramidChartRuntime } from "./pyramid_chart";
import { RadarChartDefinition, RadarChartRuntime } from "./radar_chart";
import { ScatterChartDefinition, ScatterChartRuntime } from "./scatter_chart";
import { ScorecardChartDefinition, ScorecardChartRuntime } from "./scorecard_chart";
import { SunburstChartDefinition, SunburstChartRuntime } from "./sunburst_chart";
import {
  TreeMapChartDefinition,
  TreeMapChartRuntime,
  TreeMapColoringOptions,
} from "./tree_map_chart";
import { WaterfallChartDefinition, WaterfallChartRuntime } from "./waterfall_chart";

import { Align, Color, FunctionResultObject, UID, VerticalAlign } from "../..";
import { COLORSCHEMES } from "../../helpers/color";
import { Format } from "../format";
import { Locale } from "../locale";
import { Range } from "../range";
export const CHART_TYPES = [
  "line",
  "bar",
  "pie",
  "scorecard",
  "gauge",
  "scatter",
  "combo",
  "waterfall",
  "pyramid",
  "radar",
  "geo",
  "funnel",
  "sunburst",
  "treemap",
  "calendar",
] as const;
export type ChartType = (typeof CHART_TYPES)[number];

export type ChartDefinitionWithDataSource<T extends string | Range = Range> =
  | LineChartDefinition<T>
  | PieChartDefinition<T>
  | BarChartDefinition<T>
  | ScatterChartDefinition<T>
  | ComboChartDefinition<T>
  | WaterfallChartDefinition<T>
  | PyramidChartDefinition<T>
  | RadarChartDefinition<T>
  | GeoChartDefinition<T>
  | FunnelChartDefinition<T>
  | SunburstChartDefinition<T>
  | TreeMapChartDefinition<T>
  | CalendarChartDefinition<T>;

export type ChartDefinition<T extends string | Range = string> =
  | ChartDefinitionWithDataSource<T>
  | ScorecardChartDefinition<T>
  | GaugeChartDefinition;

export type ChartTypeDefinition<T extends ChartType, R extends string | Range> = Extract<
  ChartDefinition<R>,
  { type: T }
>;

export type ChartWithColorScaleDefinition = Extract<
  ChartDefinition,
  { colorScale?: ChartColorScale }
>;

export type ChartWithTitleDefinition = Extract<ChartDefinition, { title?: TitleDesign }>;

export type ChartWithAxisDefinition = Extract<ChartDefinition<Range>, { axesDesign?: AxesDesign }>;

export type ChartJSRuntime =
  | LineChartRuntime
  | PieChartRuntime
  | BarChartRuntime
  | ComboChartRuntime
  | ScatterChartRuntime
  | WaterfallChartRuntime
  | PyramidChartRuntime
  | RadarChartRuntime
  | GeoChartRuntime
  | FunnelChartRuntime
  | SunburstChartRuntime
  | TreeMapChartRuntime;

export type ChartRuntime = ChartJSRuntime | ScorecardChartRuntime | GaugeChartRuntime;

export type CustomisableSeriesChartRuntime = Extract<
  ChartRuntime,
  { customisableSeries: { dataSetId: string; label: string }[] }
>;

export type LabelValues = FunctionResultObject[];

export interface DatasetValues {
  readonly dataSetId: UID;
  readonly label: string;
  readonly data: FunctionResultObject[];
  readonly hidden?: boolean;
}

export interface DatasetDesign {
  readonly backgroundColor?: string;
  readonly yAxisId?: string;
  readonly label?: string;
}

export interface AxisDesign {
  readonly title?: TitleDesign;
}

export interface AxesDesign {
  readonly x?: AxisDesign;
  readonly y?: AxisDesign;
  readonly y1?: AxisDesign;
}

export interface ChartStyle {
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly align?: Align;
  readonly verticalAlign?: VerticalAlign;
  readonly color?: Color;
  readonly fontSize?: number;
  readonly fillColor?: Color;
}

export interface TitleDesign extends ChartStyle {
  readonly text?: string;
}

export type TrendType = "polynomial" | "exponential" | "logarithmic" | "trailingMovingAverage";
export interface TrendConfiguration {
  type?: TrendType;
  order?: number;
  color?: Color;
  display?: boolean;
  window?: number;
}

export type DataSetStyle = Record<UID, CustomizedDataSet>;

export type CustomizedDataSet = {
  readonly trend?: TrendConfiguration;
} & DatasetDesign;

export interface ChartRangeDataSource<T extends string | Range = Range> {
  readonly type: "range";
  readonly dataSets: { dataSetId: UID; dataRange: T }[];
  readonly dataSetsHaveTitle: boolean;
  readonly labelRange?: T;
}

export interface ChartPivotDataSource {
  readonly type: "pivot";
  readonly pivotId: UID;
}

export type ChartDataSource<T extends string | Range = Range> =
  | ChartRangeDataSource<T>
  | { type: "never" };
// | ChartPivotDataSource;

export type ChartDataSourceType = ChartDataSource["type"];

export type AxisType = "category" | "linear" | "time";

export type ChartDatasetOrientation = "rows" | "columns";

export interface DataSet {
  readonly dataSetId: UID;
  readonly labelCell?: Range;
  readonly dataRange: Range;
}
export interface ExcelChartDataset {
  readonly label?: { text?: string } | { reference?: string };
  readonly range: string;
  readonly backgroundColor?: Color;
  readonly rightYAxis?: boolean;
  readonly trend?: ExcelChartTrendConfiguration;
}

export interface ExcelChartTrendConfiguration {
  readonly type?: ExcelTrendlineType;
  readonly order?: number;
  readonly color?: Color;
  readonly window?: number;
}

export type ExcelTrendlineType = "poly" | "exp" | "log" | "movingAvg" | "linear";

export type ExcelChartType = "line" | "bar" | "pie" | "combo" | "scatter" | "radar" | "pyramid";

export interface ExcelChartDefinition {
  readonly title?: TitleDesign;
  readonly type: ExcelChartType;
  readonly dataSets: ExcelChartDataset[];
  readonly labelRange?: string;
  readonly backgroundColor: XlsxHexColor;
  readonly fontColor: XlsxHexColor;
  readonly legendPosition: LegendPosition;
  readonly stacked?: boolean;
  readonly cumulative?: boolean;
  readonly verticalAxis?: {
    useLeftAxis?: boolean;
    useRightAxis?: boolean;
  };
  readonly axesDesign?: AxesDesign;
  readonly showValues?: boolean;
  readonly horizontal?: boolean;
  readonly isDoughnut?: boolean;
  readonly pieHolePercentage?: number;
  readonly maxValue?: number;
}

export interface ChartCreationContext {
  readonly dataSetStyles?: DataSetStyle;
  readonly hierarchicalDataSource?: ChartRangeDataSource<string>;
  readonly dataSource?: Partial<ChartRangeDataSource<string>>;
  readonly title?: TitleDesign;
  readonly background?: Color;
  readonly auxiliaryRange?: string;
  readonly aggregated?: boolean;
  readonly stacked?: boolean;
  readonly cumulative?: boolean;
  readonly labelsAsText?: boolean;
  readonly showSubTotals?: boolean;
  readonly showConnectorLines?: boolean;
  readonly firstValueAsSubtotal?: boolean;
  readonly legendPosition?: LegendPosition;
  readonly axesDesign?: AxesDesign;
  readonly fillArea?: boolean;
  readonly showValues?: boolean;
  readonly funnelColors?: FunnelChartColors;
  readonly showLabels?: boolean;
  readonly hideDataMarkers?: boolean;
  readonly valuesDesign?: ChartStyle;
  readonly groupColors?: (Color | undefined | null)[];
  readonly horizontal?: boolean;
  readonly isDoughnut?: boolean;
  readonly pieHolePercentage?: number;
  readonly showHeaders?: boolean;
  readonly headerDesign?: TitleDesign;
  readonly treemapColoringOptions?: TreeMapColoringOptions;
  readonly zoomable?: boolean;
  readonly humanize?: boolean;
}

export type ChartAxisFormats = { [axisId: string]: Format | undefined } | undefined;

export interface ChartData {
  dataSetsValues: DatasetValues[];
  labelValues: LabelValues;
}

export interface ChartRuntimeGenerationArgs {
  dataSetsValues: DatasetValues[];
  axisFormats: ChartAxisFormats;
  labels: string[];
  locale: Locale;
  trendDataSetsValues?: (Point[] | undefined)[];
  axisType?: AxisType;
  topPadding?: number;
}

/** Generic definition of chart to create a runtime: omit the chart type*/
export type GenericDefinition<T extends ChartDefinitionWithDataSource> = Partial<Omit<T, "type">>;

export interface ChartColorScale {
  minColor: Color;
  midColor?: Color;
  maxColor: Color;
}

export function schemeToColorScale(scheme: string): ChartColorScale | undefined {
  const colors = COLORSCHEMES[scheme];
  return colors === undefined
    ? undefined
    : {
        minColor: colors[0],
        midColor: colors.length === 3 ? colors[1] : undefined,
        maxColor: colors[colors.length - 1],
      };
}
