import { Color, Style } from "../misc";

export interface ScorecardChartDefinition {
  readonly type: "scorecard";
  readonly title: string;
  readonly keyValue?: string;
  readonly baseline?: string;
  readonly baselineMode: BaselineMode;
  readonly baselineDescr?: string;
  readonly background?: Color;
  readonly baselineColorUp: Color;
  readonly baselineColorDown: Color;
  readonly humanize?: boolean;
}

export type BaselineMode = "text" | "difference" | "percentage";
export type BaselineArrowDirection = "neutral" | "up" | "down";

export interface ScorecardChartRuntime {
  readonly title: string;
  readonly keyValue: string;
  readonly baselineDisplay: string;
  readonly baselineColor?: string;
  readonly baselineArrow: BaselineArrowDirection;
  readonly baselineDescr?: string;
  readonly background: Color;
  readonly fontColor: Color;
  readonly keyValueStyle?: Style;
  readonly baselineStyle?: Style;
}
