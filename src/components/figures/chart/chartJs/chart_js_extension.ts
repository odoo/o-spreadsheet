import { Plugin as ChartJSPlugin } from "chart.js";
import { Registry } from "../../../../registries/registry";

export const chartJsExtensionRegistry = new Registry<
  ChartJSPlugin | ((chart: typeof window.Chart) => void)
>();

/** Return window.Chart, making sure all our extensions are loaded in ChartJS */
export function getChartJSConstructor() {
  if (window.Chart && !window.Chart?.registry.plugins.get("chartShowValuesPlugin")) {
    const extensions = chartJsExtensionRegistry.getAll();
    for (const extension of extensions) {
      if (typeof extension === "function") {
        extension(window.Chart);
      } else {
        window.Chart.register(extension);
      }
    }
  }
  return window.Chart;
}
