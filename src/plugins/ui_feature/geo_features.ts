import * as GeoJSON from "geojson";
import { ModelConfig } from "../../model";
import { GeoChartRegion } from "../../types/chart/geo_chart";
import { UIPlugin, UIPluginConfig } from "../ui_plugin";

class LoadingError {}
const LOADING = new LoadingError();
export class GeoFeaturePlugin extends UIPlugin {
  static getters = [
    "getGeoJsonFeatures",
    "geoFeatureNameToId",
    "getGeoChartAvailableRegions",
  ] as const;

  private readonly geoJsonService: ModelConfig["external"]["geoJsonService"];

  private geoJsonCache: { [region: string]: GeoJSON.Feature[] | null | LoadingError } = {};
  private featureNameToIdCache: Record<string, Record<string, string | null | LoadingError>> = {};
  private availableRegions: GeoChartRegion[] | undefined | LoadingError = undefined;

  private fetchingPromise?: Promise<void>;
  private promises: Promise<void>[] = [];

  constructor(config: UIPluginConfig) {
    super(config);
    this.geoJsonService = config.external.geoJsonService;
  }

  getGeoChartAvailableRegions(): GeoChartRegion[] {
    if (!this.geoJsonService) {
      console.error("No geoJsonService provided to the model");
      return [];
    }

    if (this.availableRegions instanceof LoadingError) {
      return [];
    }
    if (this.availableRegions !== undefined) {
      return this.availableRegions;
    }

    this.availableRegions = LOADING;
    this.promises.push(
      new Promise<void>(async (resolve) => {
        this.availableRegions = (await this.geoJsonService?.getAvailableRegions()) || [];
        resolve();
      })
    );

    this.triggerFetching();
    return [];
  }

  getGeoJsonFeatures(region: string): GeoJSON.Feature[] | undefined {
    if (!this.geoJsonService) {
      console.error("No geoJsonService provided to the model");
      return;
    }

    const cachedGeoJson = this.geoJsonCache[region];

    if (cachedGeoJson instanceof LoadingError) {
      return undefined;
    }
    if (cachedGeoJson !== undefined) {
      return cachedGeoJson ?? undefined;
    }

    this.geoJsonCache[region] = LOADING;
    this.promises.push(
      new Promise<void>(async (resolve) => {
        const json = await this.geoJsonService?.getTopoJson(region);
        this.geoJsonCache[region] = this.convertToGeoJson(json);
        resolve();
      })
    );
    this.triggerFetching();
    return undefined;
  }

  geoFeatureNameToId(region: string, territory: string): string | undefined {
    if (!this.geoJsonService) {
      console.error("No geoJsonService provided to the model");
      return;
    }
    if (!this.featureNameToIdCache[region]) {
      this.featureNameToIdCache[region] = {};
    }

    const cachedFeatureId = this.featureNameToIdCache[region][territory];
    if (cachedFeatureId instanceof LoadingError) {
      return undefined;
    }
    if (cachedFeatureId !== undefined) {
      return cachedFeatureId ?? undefined;
    }

    this.promises.push(
      new Promise<void>(async (resolve) => {
        const code = (await this.geoJsonService?.geoFeatureNameToId(region, territory)) ?? null;
        this.featureNameToIdCache[region][territory] = code;
        resolve();
      })
    );
    this.triggerFetching();

    return undefined;
  }

  private convertToGeoJson(json: any): GeoJSON.Feature[] | null {
    if (!json) {
      return null;
    }
    // TopoJSON
    if (json.type === "Topology") {
      // @ts-ignore
      return window.ChartGeo.topojson.feature(json, Object.values(json.objects)[0]).features;
    }
    // GeoJSON
    else if (json.type === "FeatureCollection") {
      return json.features;
    }

    throw new Error("Invalid TopoJSON");
  }

  private triggerFetching() {
    if (!this.geoJsonService || this.fetchingPromise) {
      return;
    }
    const promises = [...this.promises];
    this.fetchingPromise = Promise.resolve().then(() => {
      return new Promise(async (resolve) => {
        await Promise.all(promises);
        this.fetchingPromise = undefined;
        resolve();

        this.dispatch("EVALUATE_CHARTS");
        if (this.promises.length) {
          this.triggerFetching();
        }
      });
    });
    this.promises = [];
  }
}
