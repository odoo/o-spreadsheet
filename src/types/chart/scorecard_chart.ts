import { Color } from "../misc";
import { TitleDesign } from "./chart";

export interface ScorecardChartDefinition {
  readonly type: "scorecard";
  readonly title: TitleDesign;
  readonly key: TitleDesign;
  readonly baseline: TitleDesign;
  readonly baselineMode: BaselineMode;
  readonly baselineDescr?: string;
  readonly background?: Color;
  readonly baselineColorUp: Color;
  readonly baselineColorDown: Color;
  readonly humanize?: boolean;
}

export type BaselineMode = "text" | "difference" | "percentage" | "progress";
export type BaselineArrowDirection = "neutral" | "up" | "down";

export interface ProgressBar {
  readonly value: number;
  readonly color: Color;
}

export interface ScorecardChartRuntime {
  readonly title: TitleDesign;
  readonly key: TitleDesign;
  readonly baselineDisplay: TitleDesign;
  readonly baselineColor?: string;
  readonly baselineArrow: BaselineArrowDirection;
  readonly baselineDescr?: string;
  readonly background: Color;
  readonly fontColor: Color;
  readonly progressBar?: ProgressBar;
}
