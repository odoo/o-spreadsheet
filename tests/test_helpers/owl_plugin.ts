import {
  plugin,
  PluginConstructor,
  PluginInstance,
  props,
  providePlugins,
  Scope,
  xml,
} from "@odoo/owl";
import { Model } from "../../src";
import { types } from "../../src/components/props_validation";
import { spreadsheetOwlPlugins } from "../../src/components/spreadsheet/spreadsheet";
import { App, Component } from "../../src/owl3_compatibility_layer";
import { DependencyContainer } from "../../src/store_engine/dependency_container";
import { useStoreProvider } from "../../src/store_engine/store_hooks";
import { _t } from "../../src/translation";
import { SpreadsheetChildEnv } from "../../src/types/spreadsheet_env";

class PluginParent extends Component<SpreadsheetChildEnv> {
  static template = xml/*xml*/ `<div/>`;
  protected props = props({
    model: types.object<Model>(),
    Plugin: types.function<any>(),
    providePlugin: types.function<(args: any) => void>(),
  });

  setup() {
    providePlugins(spreadsheetOwlPlugins, { model: this.props.model });

    const stores = useStoreProvider();
    const pluginInstance = plugin(this.props.Plugin);

    this.props.providePlugin({
      plugin: pluginInstance,
      container: stores,
      model: this.props.model,
      pluginManager: this.__owl__.pluginManager,
    });
  }
}

export function makeOwlPlugin<T extends PluginConstructor>(Plugin: T) {
  return makeOwlPluginWithModel(new Model(), Plugin);
}

export function makeOwlPluginWithModel<T extends PluginConstructor>(
  model: Model,
  Plugin: T
): {
  plugin: PluginInstance<T>;
  container: DependencyContainer;
  model: Model;
  pluginManager: Scope["pluginManager"];
} {
  const app = new App({ test: true, translateFn: _t });

  let pluginInstance: PluginInstance<T> | null = null;
  let container: DependencyContainer | null = null;
  let pluginManager: Scope["pluginManager"] | null = null;

  app.createRoot(PluginParent, {
    props: {
      model,
      Plugin,
      providePlugin: (params: any) => {
        pluginInstance = params.plugin;
        container = params.container;
        pluginManager = params.pluginManager;
      },
    },
  });

  if (!pluginInstance || !container) {
    throw new Error("Failed to create plugin instance");
  }

  return { plugin: pluginInstance, container, model, pluginManager: pluginManager! };
}
