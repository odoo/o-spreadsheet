import { Currency } from "@odoo/o-spreadsheet-engine/types/currency";
import { ImageProviderInterface } from "@odoo/o-spreadsheet-engine/types/files";
import { Model } from "..";
import { ClipboardInterface } from "../helpers/clipboard/navigator_clipboard_wrapper";
import { Get } from "../store_engine";
import { NotificationStoreMethods } from "../stores/notification_store";
import { Locale } from "./locale";

export interface EditTextOptions {
  error?: string;
  placeholder?: string;
}

export type NotificationType = "danger" | "info" | "success" | "warning";

export interface InformationNotification {
  text: string;
  type: NotificationType;
  sticky: boolean;
}

export interface SpreadsheetChildEnv extends NotificationStoreMethods {
  model: Model;
  imageProvider?: ImageProviderInterface;
  isDashboard: () => boolean;
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
}
