import { ChartConfiguration } from "chart.js";
import { Color } from "../misc";
import { Range } from "../range";
import { ChartColorScale, ChartRuntimeGenerationArgs } from "./chart";
import { DataSourceChartDefinition } from "./common_chart";

export interface GeoChartDefinition<T extends string | Range = Range>
  extends DataSourceChartDefinition<T> {
  readonly type: "geo";
  readonly colorScale?: ChartColorScale;
  readonly missingValueColor?: Color;
  readonly region?: string;
  readonly showColorBar?: boolean;
}

export type GeoChartRuntime = {
  chartJsConfig: ChartConfiguration;
};

/**
 * A point of a geo chart dataset. `feature` is the heavy, immutable GeoJSON
 * geometry shared from the geo loader; `value` and `label` are the light,
 * per-point data. chartjs-chart-geo only reads `feature` and `value`, and
 * hands the whole point back untouched as `tooltipItem.raw`.
 */
export interface GeoChartDataPoint {
  feature: GeoJSON.Feature;
  value: number | undefined;
  label: string | undefined;
}

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
