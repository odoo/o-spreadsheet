import { Align, Color, Format, Range } from "../../types";
import { XlsxHexColor } from "../xlsx";
import { BarChartDefinition, BarChartRuntime } from "./bar_chart";
import { ComboChartDefinition, ComboChartRuntime } from "./combo_chart";
import { LegendPosition } from "./common_chart";
import { GaugeChartDefinition, GaugeChartRuntime } from "./gauge_chart";
import { LineChartDefinition, LineChartRuntime } from "./line_chart";
import { PieChartDefinition, PieChartRuntime } from "./pie_chart";
import { PyramidChartDefinition, PyramidChartRuntime } from "./pyramid_chart";
import { RadarChartDefinition, RadarChartRuntime } from "./radar_chart";
import { ScatterChartDefinition, ScatterChartRuntime } from "./scatter_chart";
import { ScorecardChartDefinition, ScorecardChartRuntime } from "./scorecard_chart";
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
  | RadarChartDefinition;

export type ChartWithDataSetDefinition = Extract<
  ChartDefinition,
  { dataSets: CustomizedDataSet[]; labelRange?: string }
>;

export type ChartJSRuntime =
  | LineChartRuntime
  | PieChartRuntime
  | BarChartRuntime
  | ComboChartRuntime
  | ScatterChartRuntime
  | WaterfallChartRuntime
  | PyramidChartRuntime
  | RadarChartRuntime;

export type ChartRuntime = ChartJSRuntime | ScorecardChartRuntime | GaugeChartRuntime;

export interface LabelValues {
  readonly values: string[];
  readonly formattedValues: string[];
}

export interface DatasetValues {
  readonly label?: string;
  readonly data: any[];
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

export interface TitleDesign {
  readonly text?: string;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly align?: Align;
  readonly color?: Color;
}

export type TrendType = "polynomial" | "exponential" | "logarithmic";
export interface TrendConfiguration {
  type?: TrendType;
  order?: number;
  color?: Color;
  display?: boolean;
}

export type CustomizedDataSet = {
  readonly dataRange: string;
  readonly trend?: TrendConfiguration;
} & DatasetDesign;

export type AxisType = "category" | "linear" | "time";

export interface DataSet {
  readonly labelCell?: Range; // range of the label
  readonly dataRange: Range; // range of the data
  readonly rightYAxis?: boolean; // if the dataset should be on the right Y axis
  readonly backgroundColor?: Color;
  readonly customLabel?: string;
}
export interface ExcelChartDataset {
  readonly label?: { text?: string } | { reference?: string };
  readonly range: string;
  readonly backgroundColor?: Color;
  readonly rightYAxis?: boolean;
}

export type ExcelChartType = "line" | "bar" | "pie" | "combo" | "scatter" | "radar";

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
}

export interface ChartCreationContext {
  readonly range?: CustomizedDataSet[];
  readonly title?: TitleDesign;
  readonly background?: string;
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
}

export type ChartAxisFormats = { [axisId: string]: Format | undefined } | undefined;
