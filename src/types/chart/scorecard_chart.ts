import { Color, Style } from "../misc";
import { Range } from "../range";
import { TitleDesign } from "./chart";
import { NonDataSourceBaseChartDefinition } from "./common_chart";

export interface ScorecardChartDefinition<T extends string | Range = string>
  extends NonDataSourceBaseChartDefinition {
  readonly type: "scorecard";
  readonly keyValue?: T;
  readonly keyDescr?: TitleDesign;
  readonly baseline?: T;
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
