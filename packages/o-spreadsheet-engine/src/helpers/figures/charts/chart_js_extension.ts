import { Chart } from "chart.js";
import { Registry } from "../../../registry";

export const chartJsExtensionRegistry = new Registry<{
  register: (chart: typeof Chart) => void;
  unregister: (chart: typeof Chart) => void;
}>();

const getChartJs = () => (globalThis as any).Chart;

export function areChartJSExtensionsLoaded() {
  return !!getChartJs().registry.plugins.get("chartShowValuesPlugin");
}

export function registerChartJSExtensions() {
  if (!getChartJs() || areChartJSExtensionsLoaded()) {
    return;
  }
  for (const registryItem of chartJsExtensionRegistry.getAll()) {
    registryItem.register(getChartJs());
  }
}

export function unregisterChartJsExtensions() {
  if (!getChartJs()) {
    return;
  }
  for (const registryItem of chartJsExtensionRegistry.getAll()) {
    registryItem.unregister(getChartJs());
  }
}
