import { ChartConfiguration, ChartData, ChartDataSets, ChartOptions } from "chart.js";

export interface GaugeChartDefinition {
  readonly type: "gauge";
  readonly title: string;
  readonly dataRange?: string;
  readonly sectionRule: SectionRule;
  readonly background: string;
}

export interface SectionRule {
  readonly colors: ColorSet;
  readonly rangeMin: string;
  readonly rangeMax: string;
  readonly lowerInflectionPoint: SectionThreshold;
  readonly upperInflectionPoint: SectionThreshold;
}

interface ColorSet {
  readonly lowerColor: string;
  readonly middleColor: string;
  readonly upperColor: string;
}

interface SectionThreshold {
  readonly type: "number" | "percentage";
  readonly value: string;
}

export interface GaugeChartRuntime extends Omit<ChartConfiguration, "data" | "options"> {
  data?: GaugeChartData;
  options?: GaugeChartOptions;
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
