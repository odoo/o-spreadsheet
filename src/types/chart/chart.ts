import { Range } from "../../types";
import { XlsxHexColor } from "../xlsx";
import { BarChartDefinition, BarChartRuntime } from "./bar_chart";
import { LegendPosition, VerticalAxisPosition } from "./common_chart";
import { GaugeChartDefinition, GaugeChartRuntime } from "./gauge_chart";
import { LineChartDefinition, LineChartRuntime } from "./line_chart";
import { PieChartDefinition, PieChartRuntime } from "./pie_chart";
import { ScatterChartDefinition, ScatterChartRuntime } from "./scatter_chart";
import { ScorecardChartDefinition, ScorecardChartRuntime } from "./scorecard_chart";

export const CHART_TYPES = ["line", "bar", "pie", "scorecard", "gauge", "scatter"] as const;
export type ChartType = (typeof CHART_TYPES)[number];

export type ChartDefinition =
  | LineChartDefinition
  | PieChartDefinition
  | BarChartDefinition
  | ScorecardChartDefinition
  | GaugeChartDefinition
  | ScatterChartDefinition;

export type ChartJSRuntime =
  | LineChartRuntime
  | PieChartRuntime
  | BarChartRuntime
  | GaugeChartRuntime
  | ScatterChartRuntime;

export type ChartRuntime = ChartJSRuntime | ScorecardChartRuntime;

export interface LabelValues {
  readonly values: string[];
  readonly formattedValues: string[];
}

export interface DatasetValues {
  readonly label?: string;
  readonly data: any[];
}

export type AxisType = "category" | "linear" | "time";

export interface DataSet {
  readonly labelCell?: Range; // range of the label
  readonly dataRange: Range; // range of the data
}
export interface ExcelChartDataset {
  readonly label?: string;
  readonly range: string;
}

export type ExcelChartType = "line" | "bar" | "pie";

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
  readonly title?: string;
  readonly background?: string;
  readonly auxiliaryRange?: string;
}
