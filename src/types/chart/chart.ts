import { Point } from "chart.js";
import { Align, Color, Format, Locale, Range, VerticalAlign } from "../../types";
import { XlsxHexColor } from "../xlsx";
import { BarChartDefinition, BarChartRuntime } from "./bar_chart";
import { ComboChartDefinition, ComboChartRuntime } from "./combo_chart";
import { LegendPosition } from "./common_chart";
import { FunnelChartColors, FunnelChartDefinition, FunnelChartRuntime } from "./funnel_chart";
import { GaugeChartDefinition, GaugeChartRuntime } from "./gauge_chart";
import { GeoChartDefinition, GeoChartRuntime } from "./geo_chart";
import { LineChartDefinition, LineChartRuntime } from "./line_chart";
import { PieChartDefinition, PieChartRuntime } from "./pie_chart";
import { PyramidChartDefinition, PyramidChartRuntime } from "./pyramid_chart";
import { RadarChartDefinition, RadarChartRuntime } from "./radar_chart";
import {
  ScatterChartDefinition,
  ScatterChartRuntime,
  ScatterShowValuesMode,
} from "./scatter_chart";
import { ScorecardChartDefinition, ScorecardChartRuntime } from "./scorecard_chart";
import { SunburstChartDefinition, SunburstChartRuntime } from "./sunburst_chart";
import {
  TreeMapChartDefinition,
  TreeMapChartRuntime,
  TreeMapColoringOptions,
} from "./tree_map_chart";
import { WaterfallChartDefinition, WaterfallChartRuntime } from "./waterfall_chart";

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
] as const;
export type ChartType = (typeof CHART_TYPES)[number];

export type ChartDefinition =
  | LineChartDefinition
  | PieChartDefinition
  | BarChartDefinition
  | ScorecardChartDefinition
  | GaugeChartDefinition
  | ScatterChartDefinition
  | ComboChartDefinition
  | WaterfallChartDefinition
  | PyramidChartDefinition
  | RadarChartDefinition
  | GeoChartDefinition
  | FunnelChartDefinition
  | SunburstChartDefinition
  | TreeMapChartDefinition;

export type ChartWithDataSetDefinition = Extract<
  ChartDefinition,
  { dataSets: CustomizedDataSet[]; labelRange?: string; humanize?: boolean }
>;

export type ChartWithAxisDefinition = Extract<
  ChartWithDataSetDefinition,
  { axesDesign?: AxesDesign }
>;

export type ZoomableChartDefinition = Extract<ChartWithAxisDefinition, { zoomable?: boolean }>;

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

export interface LabelValues {
  readonly values: string[];
  readonly formattedValues: string[];
}

export interface DatasetValues {
  readonly label?: string;
  readonly data: any[];
  readonly hidden?: boolean;
  readonly pointLabels?: (string | undefined)[];
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

export type CustomizedDataSet = {
  readonly dataRange: string;
  readonly trend?: TrendConfiguration;
  readonly pointLabelRange?: string;
} & DatasetDesign;

export type AxisType = "category" | "linear" | "time";

export type ChartDatasetOrientation = "rows" | "columns";

export interface DataSet {
  readonly labelCell?: Range; // range of the label
  readonly dataRange: Range; // range of the data
  readonly rightYAxis?: boolean; // if the dataset should be on the right Y axis
  readonly backgroundColor?: Color;
  readonly customLabel?: string;
  readonly trend?: TrendConfiguration;
  readonly pointLabelRange?: Range;
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
  readonly horizontal?: boolean;
  readonly isDoughnut?: boolean;
  readonly pieHolePercentage?: number;
  readonly maxValue?: number;
}

export interface ChartCreationContext {
  readonly range?: CustomizedDataSet[];
  readonly hierarchicalRanges?: CustomizedDataSet[];
  readonly title?: TitleDesign;
  readonly background?: Color;
  readonly auxiliaryRange?: string;
  readonly aggregated?: boolean;
  readonly stacked?: boolean;
  readonly cumulative?: boolean;
  readonly dataSetsHaveTitle?: boolean;
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
  readonly showValuesMode?: ScatterShowValuesMode;
}

export type ChartAxisFormats = { [axisId: string]: Format | undefined } | undefined;

export interface ChartRuntimeGenerationArgs {
  dataSetsValues: DatasetValues[];
  axisFormats: ChartAxisFormats;
  labels: string[];
  locale: Locale;
  trendDataSetsValues?: (Point[] | undefined)[];
  axisType?: AxisType;
  topPadding?: number;
}

/** Generic definition of chart to create a runtime: omit the chart type and the dataRange of the dataSets*/
export type GenericDefinition<T extends ChartWithDataSetDefinition> = Partial<
  Omit<T, "dataSets" | "type">
> & {
  dataSets?: Omit<T["dataSets"][number], "dataRange">[];
};
