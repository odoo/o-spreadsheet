import { Range } from "../misc";
import { XlsxHexColor } from "../xlsx";
import { BarChartDefinition, BarChartRuntime } from "./bar_chart";
import { GaugeChartDefinition, GaugeChartRuntime } from "./gauge_chart";
import { LineChartDefinition, LineChartRuntime } from "./line_chart";
import { PieChartDefinition, PieChartRuntime } from "./pie_chart";
import { ScorecardChartDefinition, ScorecardChartRuntime } from "./scorecard_chart";

export type ChartType = "line" | "bar" | "pie" | "scorecard" | "gauge";

export type ChartDefinition =
  | LineChartDefinition
  | PieChartDefinition
  | BarChartDefinition
  | ScorecardChartDefinition
  | GaugeChartDefinition;

export type ChartJSRuntime =
  | LineChartRuntime
  | PieChartRuntime
  | BarChartRuntime
  | GaugeChartRuntime;

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

export interface ExcelChartDefinition {
  readonly title: string;
  readonly type: "line" | "bar" | "pie";
  readonly dataSets: ExcelChartDataset[];
  readonly labelRange?: string;
  readonly backgroundColor: XlsxHexColor;
  readonly fontColor: XlsxHexColor;
  readonly verticalAxisPosition: "left" | "right";
  readonly legendPosition: "top" | "bottom" | "left" | "right";
  readonly stackedBar?: boolean;
}

export interface ChartCreationContext {
  readonly range?: string;
  readonly title?: string;
  readonly background?: string;
}
