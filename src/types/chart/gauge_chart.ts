import { ChartConfiguration, ChartData, ChartDataSets, ChartOptions } from "chart.js";
import { Color } from "../misc";

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
  options?: GaugeChartOptions;
}

export interface GaugeChartRuntime {
  chartJsConfig: GaugeChartConfiguration;
  background: Color;
}

interface GaugeChartData extends Omit<ChartData, "datasets"> {
  datasets: GaugeChartDataSets[];
}

interface GaugeChartDataSets extends ChartDataSets {
  readonly minValue?: number;
  readonly value?: number | undefined;
  readonly backgroundColor?: string[];
}

export interface GaugeChartOptions extends ChartOptions {
  needle?: {
    radiusPercentage: number; // Needle circle radius as the percentage of the chart area width
    widthPercentage: number; // Needle width as the percentage of the chart area width
    lengthPercentage: number; // Needle length as the percentage of the interval between inner radius (0%) and outer radius (100%) of the arc
    color: Color; // The color of the needle
  };
  valueLabel?: {
    formatter: (() => string) | null;
    display: boolean;
    color: Color;
    backgroundColor: Color;
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
