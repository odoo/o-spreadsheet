import { GeoChartDefinition, GeoChartRegion } from "../../types/chart/geo_chart";
import { Command } from "../../types/commands";
import { UID } from "../../types/misc";
import { ModelConfig } from "../../types/model";
import { UIPlugin, UIPluginConfig } from "../ui_plugin";

export class GeoFeaturePlugin extends UIPlugin {
  static getters = [
    "getGeoJsonFeatures",
    "geoFeatureNameToId",
    "getGeoChartAvailableRegions",
    "getAvailableChartRegions",
  ] as const;

  private readonly geoJsonService: ModelConfig["external"]["geoJsonService"];

  private geoJsonCache: { [region: string]: GeoJSON.Feature[] | null | Promise<void> } = {};

  /** Stores the initial region of each geo chart at the time of the START command */
  private initialRegions: Record<UID, string> = {};

  constructor(config: UIPluginConfig) {
    super(config);
    this.geoJsonService = config.external.geoJsonService;
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "START": {
        for (const sheetId of this.getters.getSheetIds()) {
          for (const chartId of this.getters.getChartIds(sheetId)) {
            this.trackInitialRegion(chartId);
          }
        }
        break;
      }
      case "CREATE_CHART": {
        this.trackInitialRegion(cmd.chartId);
        break;
      }
      case "UPDATE_CHART_REGION": {
        const chart = this.getters.getChart(cmd.chartId);
        if (!chart || !chart.type.includes("geo")) {
          break;
        }
        const definition = this.getters.getChartDefinition(cmd.chartId) as GeoChartDefinition;
        this.dispatch("UPDATE_CHART", {
          chartId: cmd.chartId,
          sheetId: chart.sheetId,
          figureId: this.getters.getFigureIdFromChartId(cmd.chartId),
          definition: { ...definition, region: cmd.region },
        });
        break;
      }
    }
  }

  private trackInitialRegion(chartId: UID) {
    const chart = this.getters.getChart(chartId);
    if (chart?.type.includes("geo")) {
      const def = this.getters.getChartDefinition(chartId) as GeoChartDefinition;
      const availableRegions = this.getGeoChartAvailableRegions();
      this.initialRegions[chartId] = def.region || availableRegions[0]?.id || "";
    }
  }

  getGeoChartAvailableRegions(): GeoChartRegion[] {
    if (!this.geoJsonService) {
      console.error("No geoJsonService provided to the model");
      return [];
    }
    return this.geoJsonService.getAvailableRegions() || [];
  }

  /**
   * Returns the regions that can be selected as an alternative for a given geo chart in dashboard mode.
   * The available alternatives are based on the initial region of the chart (before any dashboard-level change).
   */
  getAvailableChartRegions(chartId: UID): GeoChartRegion[] {
    if (!this.geoJsonService) {
      return [];
    }
    const chart = this.getters.getChart(chartId);
    if (!chart || !chart.type.includes("geo")) {
      return [];
    }
    const initialRegion = this.initialRegions[chartId];
    if (!initialRegion) {
      return [];
    }
    return this.geoJsonService.getAlternativeRegions?.(initialRegion) || [];
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

  private convertToGeoJson(
    json: GeoJSON.FeatureCollection | TopoJSON.Topology
  ): GeoJSON.Feature[] | null {
    if (!json) {
      return null;
    }
    // TopoJSON
    if (json.type === "Topology") {
      const features = (globalThis as any).ChartGeo.topojson.feature(
        json,
        Object.values(json.objects)[0]
      );
      return features.type === "FeatureCollection" ? features.features : [features];
    }
    // GeoJSON
    else if (json.type === "FeatureCollection") {
      return json.features;
    }

    throw new Error("Invalid TopoJSON");
  }
}
