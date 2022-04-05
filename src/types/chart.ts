import { Range, UID } from ".";
import { XlsxHexColor } from "./xlsx";

export interface DataSet {
  labelCell?: Range; // range of the label
  dataRange: Range; // range of the data
}

export type ChartType = BasicChartType | "scorecard";

export type BasicChartType = "line" | "bar" | "pie";

export interface ExcelChartDataset {
  label?: string;
  range: string;
}

// ---------------------------------------------------------------------------
// ChartDefinition : internal representation of charts
// ---------------------------------------------------------------------------

export type ChartDefinition = ScorecardChartDefinition | BasicChartDefinition;

export interface BasicChartDefinition {
  dataSets: DataSet[];
  labelRange?: Range;
  sheetId: UID;
  title: string;
  type: BasicChartType;
  background: string;
  verticalAxisPosition: "left" | "right";
  legendPosition: "top" | "bottom" | "left" | "right";
  stackedBar: boolean;
  labelsAsText: boolean;
}

export interface ScorecardChartDefinition {
  type: "scorecard";
  sheetId: UID;
  title: string;
  keyValue: Range | undefined;
  baseline?: Range;
  baselineMode: "absolute" | "percentage";
  baselineDescr?: string;
  background?: string;
  baselineColorUp: string;
  baselineColorDown: string;
  fontColor?: string;
}

// ---------------------------------------------------------------------------
// ChartUIDefinition : representation of charts for UI components/for export
// ---------------------------------------------------------------------------

export type ChartUIDefinition = ScorecardChartUIDefinition | BasicChartUIDefinition;

export interface BasicChartUIDefinition
  extends Omit<BasicChartDefinition, "dataSets" | "labelRange" | "sheetId"> {
  dataSets: string[];
  dataSetsHaveTitle: boolean;
  labelRange?: string;
}
export interface ScorecardChartUIDefinition
  extends Omit<ScorecardChartDefinition, "keyValue" | "baseline" | "sheetId"> {
  keyValue: string | undefined;
  baseline?: string;
}

export interface ChartDataSet {
  label;
  data: (number | undefined | null)[];
  lineTension: 0; // 0 -> render straight lines, which is much faster
  borderColor: string;
  /**
   * color or list of color for pie charts
   */
  backgroundColor: string | string[];
}

export interface ChartData {
  labels: Array<string | string[]>;
  datasets: ChartDataSet[];
}

/** ChartUIDefinitionUpdate : Partial ChartUIDefinition for commands */
export type ChartUIDefinitionUpdate =
  | ScorecardChartUIDefinitionUpdate
  | BasicChartUIDefinitionUpdate;
export interface ScorecardChartUIDefinitionUpdate
  extends Omit<Partial<ScorecardChartUIDefinition>, "keyValue" | "baseline"> {
  keyValue?: string | null;
  baseline?: string | null;
}

export interface BasicChartUIDefinitionUpdate
  extends Omit<Partial<BasicChartUIDefinition>, "labelRange"> {
  labelRange?: string | null;
}

// ---------------------------------------------------------------------------
// ChartRuntime : representation or charts for drawing (chartJS/custom chart)
// ---------------------------------------------------------------------------

export type BaselineArrowDirection = "neutral" | "up" | "down";
export interface ScorecardChartRuntime
  extends Omit<
    ScorecardChartDefinition,
    "keyValue" | "baseline" | "sheetId" | "baselineMode" | "baselineColorDown" | "baselineColorUp"
  > {
  keyValue: string;
  baseline?: string;
  baselineColor?: string;
  baselineArrow: BaselineArrowDirection;
}

export interface ExcelChartDefinition {
  title: string;
  type: BasicChartType;
  dataSets: ExcelChartDataset[];
  labelRange?: string;
  backgroundColor: XlsxHexColor;
  fontColor: XlsxHexColor;
  verticalAxisPosition: "left" | "right";
  legendPosition: "top" | "bottom" | "left" | "right";
  stackedBar: boolean;
}

export function isBasicChartDefinition(
  chartDef: ChartDefinition
): chartDef is BasicChartDefinition {
  return chartDef.type === "bar" || chartDef.type === "line" || chartDef.type === "pie";
}

export function isBasicChartUIDefinition(
  chartDef: ChartUIDefinition
): chartDef is BasicChartUIDefinition {
  return chartDef.type === "bar" || chartDef.type === "line" || chartDef.type === "pie";
}

export function isBasicChartUpdate(
  chartUpdate: ChartUIDefinitionUpdate
): chartUpdate is BasicChartUIDefinitionUpdate {
  return (
    "dataSets" in chartUpdate ||
    "dataSetsHaveTitle" in chartUpdate ||
    "labelRange" in chartUpdate ||
    "verticalAxisPosition" in chartUpdate ||
    "legendPosition" in chartUpdate ||
    "stackedBar" in chartUpdate ||
    "labelsAsText" in chartUpdate
  );
}

export function isScorecardChartUpdate(
  chartUpdate: ChartUIDefinitionUpdate
): chartUpdate is ScorecardChartUIDefinitionUpdate {
  return (
    "keyValue" in chartUpdate ||
    "baseline" in chartUpdate ||
    "baselineMode" in chartUpdate ||
    "baselineDescr" in chartUpdate ||
    "baselineColorUp" in chartUpdate ||
    "baselineColorDown" in chartUpdate
  );
}
