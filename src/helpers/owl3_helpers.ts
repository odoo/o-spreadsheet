import { usePlugin } from "@odoo/owl";
import { SpreadsheetEnvPlugin } from "../components/spreadsheet/spreadsheet_env_owl_plugin";
import { useEnv } from "../owl3_compatibility_layer";
import { proxifyStoreMutation } from "../store_engine/store_hooks";
import { SpreadsheetChildEnv } from "../types/spreadsheet_env";
import { StoreConstructor } from "../types/store_engine";

/**
 * Comes from https://github.com/odoo/odoo/blob/master/addons/web/static/src/owl2/utils.js
 */
export function render(component: any, deep = false) {
  component.__owl__.render(deep);
}

export function useSpreadsheetEnv(): SpreadsheetChildEnv {
  const env = useEnv();
  const spreadsheetEnv = usePlugin(SpreadsheetEnvPlugin);
  const container = env.__spreadsheet_stores__;
  if (!container) {
    throw new Error("No store provider found.");
  }
  const overriddenEnv = {
    getStore: <T extends StoreConstructor>(Store: T) => {
      const store = container.get(Store);
      return proxifyStoreMutation(store, () => container.trigger("store-updated"));
    },
  };
  return new Proxy(env, {
    get(target, prop, receiver) {
      if (prop in overriddenEnv) {
        return overriddenEnv[prop];
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}
