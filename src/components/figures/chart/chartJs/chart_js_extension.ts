import { Registry } from "@odoo/o-spreadsheet-engine/registries/registry";

export const chartJsExtensionRegistry = new Registry<{
  register: (chart: typeof window.Chart) => void;
  unregister: (chart: typeof window.Chart) => void;
}>();

export function areChartJSExtensionsLoaded() {
  return !!window.Chart.registry.plugins.get("chartShowValuesPlugin");
}

export function registerChartJSExtensions() {
  if (!window.Chart || areChartJSExtensionsLoaded()) {
    return;
  }
  for (const registryItem of chartJsExtensionRegistry.getAll()) {
    registryItem.register(window.Chart);
  }
}

export function unregisterChartJsExtensions() {
  if (!window.Chart) {
    return;
  }
  for (const registryItem of chartJsExtensionRegistry.getAll()) {
    registryItem.unregister(window.Chart);
  }
}
