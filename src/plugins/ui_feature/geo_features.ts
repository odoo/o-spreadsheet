import { GeoChartDefinition, GeoChartRegion } from "../../types/chart/geo_chart";
import { Command } from "../../types/commands";
import { UID } from "../../types/misc";
import { ModelConfig } from "../../types/model";
import { UIPlugin, UIPluginConfig } from "../ui_plugin";

export class GeoFeaturePlugin extends UIPlugin {
  static getters = ["getAvailableChartRegions"] as const;

  private readonly geoJsonService: ModelConfig["external"]["geoJsonService"];

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
        const definition = this.getters.getChartDefinition(
          cmd.chartId
        ) as GeoChartDefinition<string>;
        if (!chart || definition.type !== "geo") {
          break;
        }
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
    const def = this.getters.getChartDefinition(chartId) as GeoChartDefinition<string>;
    if (def?.type === "geo") {
      const availableRegions = this.getters.getGeoChartAvailableRegions();
      this.initialRegions[chartId] = def.region || availableRegions[0]?.id || "";
    }
  }

  /**
   * Returns the regions that can be selected as an alternative for a given geo chart in dashboard mode.
   * The available alternatives are based on the initial region of the chart (before any dashboard-level change).
   */
  getAvailableChartRegions(chartId: UID): GeoChartRegion[] {
    if (!this.geoJsonService) {
      return [];
    }
    const definition = this.getters.getChartDefinition(chartId);
    if (!definition || definition.type !== "geo") {
      return [];
    }
    const initialRegion = this.initialRegions[chartId];
    if (!initialRegion) {
      return [];
    }
    return this.geoJsonService.getAlternativeRegions?.(initialRegion) || [];
  }
}
