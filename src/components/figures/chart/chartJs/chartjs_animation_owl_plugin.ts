import { OwlPluginWithModel } from "../../../../owl_plugins/owl_plugin_with_model";
import { ChartType } from "../../../../types/chart/chart";
import { UID } from "../../../../types/misc";

export class ChartAnimationPlugin extends OwlPluginWithModel {
  // Not a signal: we only want to flag the chart animation state for the next render, not re-trigger a chart render
  animationPlayed = {};

  get areAnimationsEnabled() {
    return this.model().getters.isDashboard();
  }

  disableAnimationForChart(chartId: UID, chartType: ChartType) {
    this.animationPlayed[chartId] = chartType;
  }

  enableAnimationForChart(chartId: UID) {
    this.animationPlayed[chartId] = undefined;
  }
}
