import { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { AxesDesign, CustomizedDataSet, TitleDesign } from "./chart";
import { LegendPosition } from "./common_chart";

export interface GeoChartDefinition {
  readonly type: "geo";
  readonly dataSets: CustomizedDataSet[];
  readonly dataSetsHaveTitle: boolean;
  readonly labelRange?: string;
  readonly title: TitleDesign;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly axesDesign?: AxesDesign;
  readonly aggregated?: boolean;
  readonly colorScale?: GeoChartColorScale;
}

export type GeoChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
};

export interface GeoChartCustomColorScale {
  minColor: Color;
  midColor?: Color;
  maxColor: Color;
}

export type GeoChartColorScale =
  | GeoChartCustomColorScale
  | "blues"
  | "brBG"
  | "buGn"
  | "buPu"
  | "cividis"
  | "cool"
  | "cubehelixDefault"
  | "gnBu"
  | "greens"
  | "greys"
  | "inferno"
  | "magma"
  | "orRd"
  | "oranges"
  | "pRGn"
  | "piYG"
  | "plasma"
  | "puBu"
  | "puBuGn"
  | "puOr"
  | "puRd"
  | "purples"
  | "rainbow"
  | "rdBu"
  | "rdGy"
  | "rdPu"
  | "rdYlBu"
  | "rdYlGn"
  | "reds"
  | "sinebow"
  | "spectral"
  | "turbo"
  | "viridis"
  | "warm"
  | "ylGn"
  | "ylGnBu"
  | "ylOrBr"
  | "ylOrRd";
