import { Align, Color, Range } from "../../types";
import { XlsxHexColor } from "../xlsx";
import { BarChartDefinition, BarChartRuntime } from "./bar_chart";
import { ComboChartDefinition, ComboChartRuntime } from "./combo_chart";
import { LegendPosition, VerticalAxisPosition } from "./common_chart";
import { GaugeChartDefinition, GaugeChartRuntime } from "./gauge_chart";
import { LineChartDefinition, LineChartRuntime } from "./line_chart";
import { PieChartDefinition, PieChartRuntime } from "./pie_chart";
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
  | WaterfallChartDefinition;

export type ChartWithAxisDefinition = Extract<
  ChartDefinition,
  { dataSets: string[]; labelRange?: string }
>;

export type ChartJSRuntime =
  | LineChartRuntime
  | PieChartRuntime
  | BarChartRuntime
  | ComboChartRuntime
  | ScatterChartRuntime
  | WaterfallChartRuntime;

export type ChartRuntime = ChartJSRuntime | ScorecardChartRuntime | GaugeChartRuntime;

export interface LabelValues {
  readonly values: string[];
  readonly formattedValues: string[];
}

export interface DatasetValues {
  readonly label?: string;
  readonly data: any[];
}

export interface TitleDesign {
  readonly text?: string;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly align?: Align;
  readonly color?: Color;
}

export type AxisType = "category" | "linear" | "time";

export interface DataSet {
  readonly labelCell?: Range; // range of the label
  readonly dataRange: Range; // range of the data
  readonly rightYAxis?: boolean; // if the dataset should be on the right Y axis
}
export interface ExcelChartDataset {
  readonly label?: string;
  readonly range: string;
}

export type ExcelChartType = "line" | "bar" | "pie" | "combo" | "scatter";

export interface ExcelChartDefinition {
  readonly title?: string;
  readonly type: ExcelChartType;
  readonly dataSets: ExcelChartDataset[];
  readonly labelRange?: string;
  readonly backgroundColor: XlsxHexColor;
  readonly fontColor: XlsxHexColor;
  readonly verticalAxisPosition: VerticalAxisPosition;
  readonly legendPosition: LegendPosition;
  readonly stacked?: boolean;
  readonly cumulative?: boolean;
}

export interface ChartCreationContext {
  readonly range?: string[];
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
  readonly verticalAxisPosition?: VerticalAxisPosition;
  readonly legendPosition?: LegendPosition;
}
