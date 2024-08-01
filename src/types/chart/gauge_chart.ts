import type { ChartConfiguration, ChartData, ChartDataset, ChartOptions } from "chart.js";
import type { Color } from "../misc";

export interface GaugeChartDefinition {
  readonly type: "gauge";
  readonly title: string;
  readonly dataRange?: string;
  readonly sectionRule: SectionRule;
  readonly background?: Color;
}

export interface SectionRule {
  readonly colors: ColorSet;
  readonly rangeMin: string;
  readonly rangeMax: string;
  readonly lowerInflectionPoint: SectionThreshold;
  readonly upperInflectionPoint: SectionThreshold;
}

interface ColorSet {
  readonly lowerColor: Color;
  readonly middleColor: Color;
  readonly upperColor: Color;
}

interface SectionThreshold {
  readonly type: "number" | "percentage";
  readonly value: string;
}

export interface GaugeChartConfiguration extends Omit<ChartConfiguration, "data" | "options"> {
  data?: GaugeChartData;
  options: GaugeChartOptions;
}

export interface GaugeChartRuntime {
  chartJsConfig: GaugeChartConfiguration;
  background: Color;
}

interface GaugeChartData extends Omit<ChartData, "datasets"> {
  datasets: GaugeChartDataSets[];
}

interface GaugeChartDataSets extends ChartDataset<"doughnut"> {
  readonly minValue?: number;
  readonly value?: number | undefined;
  readonly backgroundColor?: string[];
}

export interface GaugeChartOptions extends ChartOptions {
  needle?: NeedleOptions;
  valueLabel?: ValueLabelOptions;
}

export interface NeedleOptions {
  display?: boolean;
  borderColor?: Color;
  backgroundColor?: Color;
  /**
   * Needle width as the percentage of the chart area width
   */
  width?: number;
}

export interface ValueLabelOptions {
  display?: boolean;
  formatter?: (value) => string;
  font?: {
    size?: number;
    family?: string;
    color?: Color;
  };
  backgroundColor?: Color;
  borderColor?: Color;
  borderRadius?: number;
  padding?: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
}
