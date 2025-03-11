import { Plugin as ChartJSPlugin } from "chart.js";
import { Registry } from "../../../../registries/registry";

export const chartJsExtensionRegistry = new Registry<ChartJSPlugin>();

/** Return window.Chart, making sure all our extensions are loaded in ChartJS */
export function getChartJSConstructor() {
  if (window.Chart && !window.Chart?.registry.plugins.get("chartShowValuesPlugin")) {
    window.Chart.register(...chartJsExtensionRegistry.getAll());
  }
  return window.Chart;
}
