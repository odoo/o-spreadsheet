import { PluginConstructor, PluginInstance, Signal } from "@odoo/owl";
import { Model } from "../model";
import { ClipboardInterface } from "./clipboard/clipboard_interface";
import { Get } from "./store_engine";

export interface SpreadsheetChildEnv {
  clipboard: ClipboardInterface;
  getStore: Get;
  isSmall: boolean;
  printSpreadsheet: () => void;
}

export type OwlPluginGetter = <T extends PluginConstructor>(plugin: T) => PluginInstance<T>;

export interface SpreadsheetActionEnv extends SpreadsheetChildEnv {
  getPlugin: OwlPluginGetter;
  model: Signal<Model>;
}
