import { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { ChartColorScale, ChartRuntimeGenerationArgs } from "./chart";
import { CommonChartDefinition } from "./common_chart";

export interface GeoChartDefinition extends CommonChartDefinition {
  readonly type: "geo";
  readonly colorScale?: ChartColorScale;
  readonly missingValueColor?: Color;
  readonly region?: string;
  readonly showColorBar?: boolean;
}

export type GeoChartRuntime = {
  chartJsConfig: ChartConfiguration;
  background: Color;
};

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
