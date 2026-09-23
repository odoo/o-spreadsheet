import { PluginConstructor, PluginInstance } from "@odoo/owl";
import { Model } from "../model";
import { ClipboardInterface } from "./clipboard/clipboard_interface";
import { ImageProviderInterface } from "./files";
import { Locale } from "./locale";
import { Get } from "./store_engine";

export interface SpreadsheetChildEnv {
  model: Model;
  imageProvider?: ImageProviderInterface;
  clipboard: ClipboardInterface;
  startCellEdition: (content?: string) => void;
  loadLocales: () => Promise<Locale[]>;
  getStore: Get;
  isSmall: boolean;
  printSpreadsheet: () => void;
}

export type OwlPluginGetter = <T extends PluginConstructor>(plugin: T) => PluginInstance<T>;

export interface SpreadsheetActionEnv extends SpreadsheetChildEnv {
  getPlugin: OwlPluginGetter;
}
