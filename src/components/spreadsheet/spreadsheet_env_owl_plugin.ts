import { PluginConstructor } from "@odoo/owl";
import { Registry } from "../../registries/registry";

interface SpreadsheetEnvProvider {
  owlPlugin: PluginConstructor;
  envKeys: string[];
}

export const spreadsheetEnvRegistry = new Registry<SpreadsheetEnvProvider>();
