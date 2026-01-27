import { Color, Style } from "../misc";
import { TitleDesign } from "./chart";
import { MinimalChartDefinition } from "./common_chart";

export interface ScorecardChartDefinition extends MinimalChartDefinition {
  readonly type: "scorecard";
  readonly keyValue?: string;
  readonly keyDescr?: TitleDesign;
  readonly baseline?: string;
  readonly baselineMode: BaselineMode;
  readonly baselineDescr?: TitleDesign;
  readonly baselineColorUp: Color;
  readonly baselineColorDown: Color;
}

export type BaselineMode = "text" | "difference" | "percentage" | "progress";
export type BaselineArrowDirection = "neutral" | "up" | "down";

export interface ProgressBar {
  readonly value: number;
  readonly color: Color;
}

export interface ScorecardChartRuntime {
  readonly title: TitleDesign;
  readonly keyValue: string;
  readonly keyDescr: string;
  readonly baselineDisplay: string;
  readonly baselineColor?: string;
  readonly baselineArrow: BaselineArrowDirection;
  readonly baselineDescr?: string;
  readonly background: Color;
  readonly fontColor: Color;
  readonly keyValueStyle?: Style;
  readonly keyValueDescrStyle?: Style;
  readonly baselineStyle?: Style;
  readonly baselineDescrStyle?: Style;
  readonly progressBar?: ProgressBar;
}
