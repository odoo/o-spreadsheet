import { Plugin, PluginInstance, providePlugins, useConfig, usePlugin } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";

export function useSpreadsheetEnv(): PluginInstance<typeof EnvPlugin> {
  let envPlugin: PluginInstance<typeof EnvPlugin>;
  try {
    envPlugin = usePlugin(EnvPlugin);
  } catch (e) {
    providePlugins([EnvPlugin]);
    envPlugin = usePlugin(EnvPlugin);
  }
  return envPlugin;
}

export class EnvPlugin extends Plugin {
  private parentEnv: EnvPlugin | undefined = useConfig("parentEnv");
  private properties: Partial<SpreadsheetChildEnv> = useConfig("envProperties") || {};

  env!: SpreadsheetChildEnv;

  setup() {
    this.env = this.buildEnv();
  }

  registerProperties(properties: Partial<SpreadsheetChildEnv>) {
    Object.defineProperties(this.properties, Object.getOwnPropertyDescriptors(properties));
    this.env = this.buildEnv();
  }

  registerParentEnv(parentEnv: EnvPlugin) {
    this.parentEnv = parentEnv;
    this.env = this.buildEnv();
  }

  private buildEnv(): SpreadsheetChildEnv {
    const env = {};
    Object.defineProperties(env, Object.getOwnPropertyDescriptors(this.parentEnv?.env || {}));
    Object.defineProperties(env, Object.getOwnPropertyDescriptors(this.properties));
    return env as SpreadsheetChildEnv;
  }
}
