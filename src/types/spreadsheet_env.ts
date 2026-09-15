import { PluginConstructor, PluginInstance, Signal } from "@odoo/owl";
import { Model } from "../model";
import { Get } from "./store_engine";

export interface SpreadsheetChildEnv {
  getStore: Get;
  isSmall: boolean;
}

export type OwlPluginGetter = <T extends PluginConstructor>(plugin: T) => PluginInstance<T>;

export interface SpreadsheetActionEnv extends SpreadsheetChildEnv {
  getPlugin: OwlPluginGetter;
  model: Signal<Model>;
}
