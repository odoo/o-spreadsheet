import { Model } from "..";
import { ClipboardInterface } from "../helpers/clipboard/navigator_clipboard_wrapper";
import { FocusableElement } from "../helpers/focus_manager";
import { Currency } from "./currency";
import { ImageProviderInterface } from "./files";
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

export interface SpreadsheetEnv {
  notifyUser: (notification: InformationNotification) => any;
  raiseError: (text: string, callback?: () => void) => any;
  askConfirmation: (content: string, confirm: () => any, cancel?: () => any) => any;
}

export interface SpreadsheetChildEnv extends SpreadsheetEnv {
  model: Model;
  imageProvider?: ImageProviderInterface;
  isDashboard: () => boolean;
  openSidePanel: (panel: string, panelProps?: any) => void;
  toggleSidePanel: (panel: string, panelProps?: any) => void;
  clipboard: ClipboardInterface;
  startCellEdition: (content?: string) => void;
  loadCurrencies?: () => Promise<Currency[]>;
  loadLocales: () => Promise<Locale[]>;
  focusableElement: FocusableElement;
}
