import { PluginConstructor, PluginInstance } from "@odoo/owl";
import { Model } from "../model";
import { ImageProviderInterface } from "./files";
import { Get } from "./store_engine";

export interface SpreadsheetChildEnv {
  model: Model;
  imageProvider?: ImageProviderInterface;
  getStore: Get;
  isSmall: boolean;
  printSpreadsheet: () => void;
}

export type OwlPluginGetter = <T extends PluginConstructor>(plugin: T) => PluginInstance<T>;

export interface SpreadsheetActionEnv extends SpreadsheetChildEnv {
  getPlugin: OwlPluginGetter;
}
