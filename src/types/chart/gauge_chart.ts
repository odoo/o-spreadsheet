import type { ChartOptions } from "chart.js";
import { Color } from "../misc";
import { TitleDesign } from "./chart";

export interface GaugeChartDefinition {
  readonly type: "gauge";
  readonly title: TitleDesign;
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

export interface SectionThreshold {
  readonly type: "number" | "percentage";
  readonly value: string;
}

export interface GaugeValue {
  value: number;
  label: string;
}

export interface GaugeChartRuntime {
  background: Color;
  title: TitleDesign;
  minValue: GaugeValue;
  maxValue: GaugeValue;
  gaugeValue?: GaugeValue;
  inflectionValues: GaugeValue[];
  colors: Color[];
}

export interface GaugeChartOptions extends ChartOptions {
  needle?: NeedleOptions;
  valueLabel?: ValueLabelOptions;
  inflectionValues: InflectionValuesOptions[];
  minValue: string;
  maxValue: string;
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

export interface InflectionValuesOptions {
  value: number;
  color: Color;
  label: string;
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
