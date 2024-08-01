import type { Range } from "../../types";
import type { XlsxHexColor } from "../xlsx";
import type { BarChartDefinition, BarChartRuntime } from "./bar_chart";
import type { LegendPosition, VerticalAxisPosition } from "./common_chart";
import type { GaugeChartDefinition, GaugeChartRuntime } from "./gauge_chart";
import type { LineChartDefinition, LineChartRuntime } from "./line_chart";
import type { PieChartDefinition, PieChartRuntime } from "./pie_chart";
import type { ScorecardChartDefinition, ScorecardChartRuntime } from "./scorecard_chart";

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
