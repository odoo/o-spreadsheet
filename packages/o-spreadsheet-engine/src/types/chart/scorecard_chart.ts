import { Color, Style } from "../misc";
import { Range } from "../range";
import { TitleDesign } from "./chart";

export interface ScorecardChartDefinition<T extends string | Range = string> {
  readonly type: "scorecard";
  readonly title: TitleDesign;
  readonly keyValue?: T;
  readonly keyDescr?: TitleDesign;
  readonly baseline?: T;
  readonly baselineMode: BaselineMode;
  readonly baselineDescr?: TitleDesign;
  readonly background?: Color;
  readonly baselineColorUp: Color;
  readonly baselineColorDown: Color;
  readonly humanize?: boolean;
  readonly dataSource?: { type: "never" };
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
