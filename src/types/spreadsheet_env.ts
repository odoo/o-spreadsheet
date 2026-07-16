import { Model } from "../model";
import { ClipboardInterface } from "./clipboard/clipboard_interface";
import { Currency } from "./currency";
import { ImageProviderInterface } from "./files";
import { RenderingGetters } from "./getters";
import { Locale } from "./locale";
import { UID } from "./misc";
import { Get } from "./store_engine";
import { NotificationStoreMethods } from "./stores/notification_store_methods";

export interface SpreadsheetChildEnv extends NotificationStoreMethods {
  model: Model;
  imageProvider?: ImageProviderInterface;
  openSidePanel: (panel: string, panelProps?: any) => void;
  replaceSidePanel: (panel: string, currentPanel: string, panelProps?: any) => void;
  toggleSidePanel: (panel: string, panelProps?: any) => void;
  clipboard: ClipboardInterface;
  startCellEdition: (content?: string) => void;
  loadCurrencies?: () => Promise<Currency[]>;
  loadLocales: () => Promise<Locale[]>;
  getStore: Get;
  isSmall: boolean;
  isMobile: () => boolean;
  printSpreadsheet: () => void;
}

export interface RenderingModel extends Omit<Model, "getters"> {
  getters: RenderingGetters;
}

// FIXME CAROUSELS: this should be removed, with the env containing the sheetId/viewports for ALL component
export interface SpreadsheetRenderingEnv extends Omit<SpreadsheetChildEnv, "model"> {
  model: RenderingModel;
  sheetId: UID;
}
