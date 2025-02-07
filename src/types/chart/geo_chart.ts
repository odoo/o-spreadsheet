import { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { AxesDesign, ChartRuntimeGenerationArgs, CustomizedDataSet, TitleDesign } from "./chart";
import { LegendPosition } from "./common_chart";

export interface GeoChartDefinition {
  readonly type: "geo";
  readonly dataSets: CustomizedDataSet[];
  readonly dataSetsHaveTitle: boolean;
  readonly labelRange?: string[];
  readonly title: TitleDesign;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly axesDesign?: AxesDesign;
  readonly aggregated?: boolean;
  readonly colorScale?: GeoChartColorScale;
  readonly missingValueColor?: Color;
  readonly region?: string;
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
  | "cividis"
  | "greens"
  | "greys"
  | "oranges"
  | "purples"
  | "rainbow"
  | "reds"
  | "viridis";

export type GeoChartProjection =
  | "azimuthalEqualArea"
  | "azimuthalEquidistant"
  | "gnomonic"
  | "orthographic"
  | "stereographic"
  | "equalEarth"
  | "albers"
  | "albersUsa"
  | "conicConformal"
  | "conicEqualArea"
  | "conicEquidistant"
  | "equirectangular"
  | "mercator"
  | "transverseMercator"
  | "naturalEarth1";

export interface GeoChartRegion {
  id: string;
  label: string;
  defaultProjection: GeoChartProjection;
}

export interface GeoChartRuntimeGenerationArgs extends ChartRuntimeGenerationArgs {
  availableRegions: GeoChartRegion[];
  getGeoJsonFeatures: (region: string) => GeoJSON.Feature[] | undefined;
  geoFeatureNameToId: (region: string, featureName: string) => string | undefined;
}
