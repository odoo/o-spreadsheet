import { usePlugin } from "@odoo/owl";
import { spreadsheetEnvRegistry } from "../components/spreadsheet/spreadsheet_env_owl_plugin";
import { useEnv } from "../owl3_compatibility_layer";
import { SpreadsheetChildEnv } from "../types/spreadsheet_env";

/**
 * Comes from https://github.com/odoo/odoo/blob/master/addons/web/static/src/owl2/utils.js
 */
export function render(component: any, deep = false) {
  component.__owl__.render(deep);
}

export function useSpreadsheetEnv(): SpreadsheetChildEnv {
  const env = useEnv();
  const spreadsheetEnv: Record<string, any> = {};
  for (const key of spreadsheetEnvRegistry.getKeys()) {
    try {
      const plugin = usePlugin(spreadsheetEnvRegistry.get(key).owlPlugin);
      const keys = spreadsheetEnvRegistry.get(key).envKeys;
      for (const k of keys) {
        spreadsheetEnv[k] = plugin[k];
      }
    } catch {}
  }

  return new Proxy(env, {
    get(target, prop, receiver) {
      if (prop in spreadsheetEnv) {
        return spreadsheetEnv[String(prop)];
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}
