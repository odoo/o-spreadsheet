import { ChartConfiguration } from "chart.js";
import { Color, UID } from "../misc";
import { ChartRuntimeGenerationArgs, DataSetDesign, TitleDesign } from "./chart";
import { ChartDataSource, LegendPosition } from "./common_chart";

export interface GeoChartDefinition {
  readonly type: "geo";
  readonly datasetsDesign: Record<UID, DataSetDesign>;
  readonly dataSource: ChartDataSource;
  readonly title: TitleDesign;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly colorScale?: GeoChartColorScale;
  readonly missingValueColor?: Color;
  readonly region?: string;
  readonly humanize?: boolean;
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
