import { ChartConfiguration } from "chart.js";
import { Range } from "../range";
import { ChartRuntimeGenerationArgs } from "./chart";
import { CommonChartDefinition } from "./common_chart";
import { GeoChartRegion } from "./geo_chart";

export interface GeoBubbleChartDefinition<T extends string | Range = Range>
  extends CommonChartDefinition<T> {
  readonly type: "geo_bubble";
  readonly region?: string;
}

export type GeoBubbleChartRuntime = {
  chartJsConfig: ChartConfiguration;
};

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface GeoBubbleChartRuntimeGenerationArgs extends ChartRuntimeGenerationArgs {
  availableRegions: GeoChartRegion[];
  getGeoJsonFeatures: (region: string) => GeoJSON.Feature[] | undefined;
  getCityCoordinates: (city: string) => GeoCoordinates | undefined;
}
