import { PluginInstance, Scope, usePlugin, useScope } from "@odoo/owl";
import { Component, useEnv } from "../owl3_compatibility_layer";
import {
  OwlPluginGetter,
  SpreadsheetActionEnv,
  SpreadsheetChildEnv,
} from "../types/spreadsheet_env";

export function createGetPluginFunctionFromScope(scope: Scope): OwlPluginGetter {
  return (plugin) => {
    let instance: PluginInstance<any> | undefined = undefined;
    scope.run(() => (instance = usePlugin(plugin)));
    if (!instance) {
      throw new Error(`Plugin ${plugin.name} not found`);
    }
    return instance as PluginInstance<any>;
  };
}

export function useSpreadsheetEnv(): SpreadsheetActionEnv {
  const env = useEnv();
  const scope = useScope();

  const getPlugin = createGetPluginFunctionFromScope(scope);
  return new Proxy(env, {
    get(target, prop, receiver) {
      if ("getPlugin" === String(prop)) {
        return getPlugin;
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

/**
 * Base class of all o-spreadsheet components. It only binds the environment
 * type, so that `this.env` is properly typed in every component.
 */
export class OSComponent extends Component<SpreadsheetChildEnv> {
  spEnv = useSpreadsheetEnv();
}
