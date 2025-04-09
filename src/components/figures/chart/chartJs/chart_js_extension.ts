import { Registry } from "../../../../registries/registry";

export const chartJsExtensionRegistry = new Registry<{
  register: (chart: typeof window.Chart) => void;
  unregister: (chart: typeof window.Chart) => void;
}>();

export function registerChartJSExtensions() {
  if (!window.Chart || window.Chart.registry.plugins.get("chartShowValuesPlugin")) {
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
