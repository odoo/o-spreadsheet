import { GlobalChart } from "@odoo/o-spreadsheet-engine";
import { Registry } from "@odoo/o-spreadsheet-engine/registries/registry";

export const chartJsExtensionRegistry = new Registry<{
  register: (chart: GlobalChart) => void;
  unregister: (chart: GlobalChart) => void;
}>();

export function areChartJSExtensionsLoaded() {
  return globalThis.Chart ? !!globalThis.Chart.registry.plugins.get("chartShowValuesPlugin") : true;
}

export function registerChartJSExtensions() {
  if (!globalThis.Chart || areChartJSExtensionsLoaded()) {
    return;
  }
  for (const registryItem of chartJsExtensionRegistry.getAll()) {
    registryItem.register(globalThis.Chart);
  }
}

export function unregisterChartJsExtensions() {
  if (!globalThis.Chart) {
    return;
  }
  for (const registryItem of chartJsExtensionRegistry.getAll()) {
    registryItem.unregister(globalThis.Chart);
  }
}
