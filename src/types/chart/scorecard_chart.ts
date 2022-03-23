export interface ScorecardChartDefinition {
  readonly type: "scorecard";
  readonly title: string;
  readonly keyValue?: string;
  readonly baseline?: string;
  readonly baselineMode: "absolute" | "percentage";
  readonly baselineDescr?: string;
  readonly background?: string;
  readonly baselineColorUp: string;
  readonly baselineColorDown: string;
  readonly fontColor?: string;
}

export type BaselineArrowDirection = "neutral" | "up" | "down";
export interface ScorecardChartRuntime {
  readonly title: string;
  readonly keyValue: string;
  readonly baselineDisplay: string;
  readonly baselineColor?: string;
  readonly baselineArrow: BaselineArrowDirection;
  readonly baselineDescr?: string;
  readonly background?: string;
  readonly fontColor?: string;
}
