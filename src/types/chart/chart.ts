import { Align, Color, Range } from "../../types";
import { XlsxHexColor } from "../xlsx";
import { BarChartDefinition, BarChartRuntime } from "./bar_chart";
import { ComboChartDefinition, ComboChartRuntime } from "./combo_chart";
import { LegendPosition } from "./common_chart";
import { GaugeChartDefinition, GaugeChartRuntime } from "./gauge_chart";
import { LineChartDefinition, LineChartRuntime } from "./line_chart";
import { PieChartDefinition, PieChartRuntime } from "./pie_chart";
import { PyramidChartDefinition, PyramidChartRuntime } from "./pyramid_chart";
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
  | PyramidChartDefinition;

export type ChartWithAxisDefinition = Extract<
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
  | PyramidChartRuntime;

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

export interface TitleDesign {
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly align?: Align;
  readonly color?: Color;
}

export type Title = {
  design?: TitleDesign;
} & ({ type: "reference"; readonly text: string } | { type: "string"; readonly text: string });

export interface AxesDesign {
  readonly x?: Title;
  readonly y?: Title;
  readonly y1?: Title;
}

export type ChartTitleType = "reference" | "string";

export type ChartAxisTitleRuntime =
  | {
      display: boolean;
      text: string;
      color?: string;
      font: {
        style: "italic" | "normal";
        weight: "bold" | "normal";
      };
      align: "start" | "center" | "end";
    }
  | undefined;

/**
 * Defines types used within AbstractChart for specifying titles and axes design.
 *
 * Reason:
 * In the definition, only range strings are stored. However, for AbstractChart,
 * it's necessary to store the actual range objects.
 */

export type AbstractChartTitle = {
  readonly design?: TitleDesign;
} & (
  | { type: "reference"; readonly reference: Range | undefined }
  | { type: "string"; readonly value: string }
);

export type AbstractChartAxesDesign = {
  readonly x?: AbstractChartTitle;
  readonly y?: AbstractChartTitle;
  readonly y1?: AbstractChartTitle;
};

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

export type ExcelChartType = "line" | "bar" | "pie" | "combo" | "scatter";

export interface ExcelChartDefinition {
  readonly title?: Title;
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
  readonly title?: Title;
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
