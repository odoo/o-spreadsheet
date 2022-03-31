import { ChartOptions } from "chart.js";
import { Range, UID } from ".";
import { XlsxHexColor } from "./xlsx";

export interface DataSet {
  labelCell?: Range; // range of the label
  dataRange: Range; // range of the data
}

export type ChartType = BasicChartType | "scorecard" | "gauge";

export type BasicChartType = "line" | "bar" | "pie";

export interface ExcelChartDataset {
  label?: string;
  range: string;
}

// ---------------------------------------------------------------------------
// ChartDefinition : internal representation of charts
// ---------------------------------------------------------------------------

export type ChartDefinition =
  | ScorecardChartDefinition
  | GaugeChartDefinition
  | BasicChartDefinition;

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

interface ColorSet {
  lowerColor: string;
  middleColor: string;
  upperColor: string;
}

interface SectionThreshold {
  type: "number" | "percentage";
  value: string;
}

export interface SectionRule {
  colors: ColorSet;
  rangeMin: string;
  rangeMax: string;
  lowerInflectionPoint: SectionThreshold;
  upperInflectionPoint: SectionThreshold;
}

export interface GaugeChartDefinition {
  type: "gauge";
  sheetId: UID;
  title: string;
  dataRange: Range | undefined;
  sectionRule: SectionRule;
  background: string;
}

// ---------------------------------------------------------------------------
// ChartUIDefinition : representation of charts for UI components/for export
// ---------------------------------------------------------------------------

export type ChartUIDefinition =
  | BasicChartUIDefinition
  | ScorecardChartUIDefinition
  | GaugeChartUIDefinition;

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
export interface GaugeChartUIDefinition
  extends Omit<GaugeChartDefinition, "dataRange" | "sheetId"> {
  dataRange: string | undefined;
}

/** ChartUIDefinitionUpdate : Partial ChartUIDefinition for commands */
export type ChartUIDefinitionUpdate =
  | BasicChartUIDefinitionUpdate
  | ScorecardChartUIDefinitionUpdate
  | GaugeChartUIDefinitionUpdate;

export interface BasicChartUIDefinitionUpdate
  extends Omit<Partial<BasicChartUIDefinition>, "labelRange" | "type"> {
  labelRange?: string | null;
}

export interface ScorecardChartUIDefinitionUpdate
  extends Omit<Partial<ScorecardChartUIDefinition>, "keyValue" | "baseline"> {
  keyValue?: string | null;
  baseline?: string | null;
}

export interface BasicChartUIDefinitionUpdate
  extends Omit<Partial<BasicChartUIDefinition>, "labelRange"> {
  labelRange?: string | null;
}

export type GaugeChartUIDefinitionUpdate = Partial<GaugeChartUIDefinition>;

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

export interface GaugeChartRuntime extends Omit<GaugeChartDefinition, "dataRange" | "sheetId"> {
  dataRange: string;
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

export function isGaugeChartUpdate(
  chartUpdate: ChartUIDefinitionUpdate
): chartUpdate is GaugeChartUIDefinitionUpdate {
  return (
    "dataRange" in chartUpdate ||
    "rangeMin" in chartUpdate ||
    "rangeMax" in chartUpdate ||
    "sectionRule" in chartUpdate
  );
}

// ---------------------------------------------------------------------------
// Chart configuration
// ---------------------------------------------------------------------------
export interface ChartConfiguration {
  type: string;
  data: ChartData;
  options: ChartOptions;
}
interface ChartData {
  labels: Array<string | string[]>;
  datasets: ChartDataSets[];
}

interface ChartDataSets {
  data: (number | undefined | null)[];
}

export interface BasicChartConfiguration extends Omit<ChartConfiguration, "data"> {
  data?: BasicChartData;
}

export interface BasicChartData extends Omit<ChartData, "datasets"> {
  datasets: BasicChartDataSet[];
}

export interface BasicChartDataSet extends ChartDataSets {
  label?;
  lineTension?: 0; // 0 -> render straight lines, which is much faster
  borderColor?: string;
  /**
   * color or list of color for pie charts
   */
  backgroundColor?: string | string[];
}

// respect the gauge chart implementation : https://www.npmjs.com/package/chartjs-gauge
export interface GaugeChartConfiguration extends Omit<ChartConfiguration, "data" | "options"> {
  data?: GaugeChartData;
  options?: GaugeChartOptions;
}

interface GaugeChartData extends Omit<ChartData, "datasets"> {
  datasets: GaugeChartDataSets[];
}

interface GaugeChartDataSets extends ChartDataSets {
  minValue?: number;
  value?: number | undefined;
  backgroundColor?: string[];
}

interface GaugeChartOptions extends ChartOptions {
  needle?: {
    radiusPercentage: number; // Needle circle radius as the percentage of the chart area width
    widthPercentage: number; // Needle width as the percentage of the chart area width
    lengthPercentage: number; // Needle length as the percentage of the interval between inner radius (0%) and outer radius (100%) of the arc
    color: string; // The color of the needle
  };
  valueLabel?: {
    formatter: (() => string) | null;
    display: boolean;
    color: string;
    backgroundColor: string;
    borderRadius: number;
    fontSize: number;
    padding: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
    bottomMarginPercentage: number;
  };
}
