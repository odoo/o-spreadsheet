import { Plugin, PluginConstructor, PluginInstance, usePlugin } from "@odoo/owl";
import { Registry } from "../../registries/registry";

interface SpreadsheetEnvProvider {
  owlPlugin: PluginConstructor;
  keys: string[];
}

export const spreadsheetEnvRegistry = new Registry<SpreadsheetEnvProvider>();

export class SpreadsheetEnvPlugin extends Plugin {
  plugins!: { plugin: PluginInstance<typeof Plugin>; keys: string[] }[];

  setup() {
    this.plugins = [];
    for (const key of spreadsheetEnvRegistry.getKeys()) {
      const plugin = usePlugin(spreadsheetEnvRegistry.get(key).owlPlugin);
      this.plugins.push({ plugin, keys: spreadsheetEnvRegistry.get(key).keys });
    }
  }

  get env() {
    const env: Record<string, any> = {};
    for (const plugin of this.plugins) {
      for (const key of plugin.keys) {
        env[key] = env[key];
      }
    }
    return env;
  }
}
