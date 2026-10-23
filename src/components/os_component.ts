import { Component, PluginInstance, Scope, Signal, usePlugin, useScope } from "@odoo/owl";
import { Model } from "../model";
import { useEnv } from "../owl3_compatibility_layer";
import { ModelPlugin } from "../owl_plugins/model_owl_plugin";
import { OwlPluginGetter, SpreadsheetActionEnv } from "../types/spreadsheet_env";

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
  const model = usePlugin(ModelPlugin).model;
  const scope = useScope();

  const getPlugin = createGetPluginFunctionFromScope(scope);
  const getMaybePlugin = (plugin) => {
    try {
      return getPlugin(plugin);
    } catch {
      return undefined;
    }
  };
  return new Proxy(env, {
    get(target, prop, receiver) {
      if ("model" === String(prop)) {
        return model;
      } else if ("getPlugin" === String(prop)) {
        return getPlugin;
      } else if ("getMaybePlugin" === String(prop)) {
        return getMaybePlugin;
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

/**
 * Base class of all o-spreadsheet components. It gives access to the model and
 * to the spreadsheet environment (`this.spEnv`).
 */
export class OSComponent extends Component {
  modelPlugin = usePlugin(ModelPlugin);
  spEnv = useSpreadsheetEnv();

  get model(): Signal<Model> {
    return this.modelPlugin.model;
  }
}
