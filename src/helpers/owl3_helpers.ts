import { PluginConstructor, PluginInstance, usePlugin, useScope } from "@odoo/owl";
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
  const scope = useScope();

  const getPlugin = <T extends PluginConstructor>(plugin: T): PluginInstance<T> => {
    let instance: PluginInstance<T> | undefined = undefined;
    scope.run(() => {
      instance = usePlugin(plugin);
    });
    if (!instance) {
      throw new Error(`Plugin ${plugin.name} not found`);
    }
    return instance as PluginInstance<T>;
  };

  return new Proxy(env, {
    get(target, prop, receiver) {
      if ("getPlugin" === String(prop)) {
        return getPlugin;
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}
