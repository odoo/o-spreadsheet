import * as GeoJSON from "geojson";
import TopoJSON from "topojson-specification";
import { isDefined } from "../../helpers";
import { ModelConfig } from "../../model";
import { GeoChartRegion } from "../../types/chart/geo_chart";
import { UIPlugin, UIPluginConfig } from "../ui_plugin";

export class GeoFeaturePlugin extends UIPlugin {
  static getters = [
    "getGeoJsonFeatures",
    "geoFeatureNameToId",
    "getGeoChartAvailableRegions",
    "loadUsedGeoJsonFeatures",
  ] as const;

  private readonly geoJsonService: ModelConfig["external"]["geoJsonService"];

  private geoJsonCache: { [region: string]: GeoJSON.Feature[] | null | Promise<void> } = {};

  constructor(config: UIPluginConfig) {
    super(config);
    this.geoJsonService = config.external.geoJsonService;
  }

  getGeoChartAvailableRegions(): GeoChartRegion[] {
    if (!this.geoJsonService) {
      console.error("No geoJsonService provided to the model");
      return [];
    }
    return this.geoJsonService.getAvailableRegions() || [];
  }

  getGeoJsonFeatures(region: string): GeoJSON.Feature[] | undefined {
    if (!this.geoJsonService) {
      console.error("No geoJsonService provided to the model");
      return;
    }

    const cachedGeoJson = this.geoJsonCache[region];

    if (cachedGeoJson instanceof Promise) {
      return undefined;
    }
    if (cachedGeoJson !== undefined) {
      return cachedGeoJson ?? undefined;
    }

    this.geoJsonCache[region] = new Promise<void>(async (resolve) => {
      const json = await this.geoJsonService?.getTopoJson(region);
      this.geoJsonCache[region] = this.convertToGeoJson(json);
      this.dispatch("EVALUATE_CHARTS");
      resolve();
    });
    return undefined;
  }

  geoFeatureNameToId(region: string, featureName: string): string | undefined {
    if (!this.geoJsonService) {
      console.error("No geoJsonService provided to the model");
      return;
    }
    return this.geoJsonService.geoFeatureNameToId(region, featureName);
  }

  loadUsedGeoJsonFeatures(): Promise<void> {
    const regions = this.getters
      .getSheetIds()
      .flatMap((sheetId) =>
        this.getters.getChartIds(sheetId).map((chartId) => {
          const definition = this.getters.getChartDefinition(chartId);
          return definition.type === "geo"
            ? definition.region || this.getters.getGeoChartAvailableRegions()[0]?.id
            : undefined;
        })
      )
      .filter(isDefined);

    const uniqueRegions = Array.from(new Set(regions));
    if (uniqueRegions.length && !this.geoJsonService) {
      console.error("No geoJsonService provided to the model");
      return Promise.resolve();
    }

    for (const region of uniqueRegions) {
      this.getGeoJsonFeatures(region); // Trigger the loading of the regions
    }

    const promises = uniqueRegions.map((region) => {
      const cachedGeoJson = this.geoJsonCache[region];
      return cachedGeoJson instanceof Promise ? cachedGeoJson : Promise.resolve();
    });
    return Promise.all(promises).then(() => {});
  }

  private convertToGeoJson(
    json: GeoJSON.FeatureCollection | TopoJSON.Topology
  ): GeoJSON.Feature[] | null {
    if (!json) {
      return null;
    }
    // TopoJSON
    if (json.type === "Topology") {
      const features = window.ChartGeo.topojson.feature(json, Object.values(json.objects)[0]);
      return features.type === "FeatureCollection" ? features.features : [features];
    }
    // GeoJSON
    else if (json.type === "FeatureCollection") {
      return json.features;
    }

    throw new Error("Invalid TopoJSON");
  }
}
