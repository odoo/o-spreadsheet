import { Model } from "..";
import { FocusableElement } from "../helpers/focus_manager";
import { TranslationFunction } from "../translation";
import { Currency } from "./currency";

export interface EditTextOptions {
  error?: string;
  placeholder?: string;
}

export type notificationType = "ERROR" | "INFORMATION";

export interface InformationNotification {
  text: string;
  tag: string;
}

export interface SpreadsheetEnv {
  notifyUser: (notification: InformationNotification) => any;
  raiseError: (text: string) => any;
  askConfirmation: (content: string, confirm: () => any, cancel?: () => any) => any;
  editText: (
    title: string,
    callback: (text: string | null) => any,
    options?: EditTextOptions
  ) => any;
  loadCurrencies: () => Promise<Currency[]>;
}

export interface SpreadsheetChildEnv extends SpreadsheetEnv {
  model: Model;
  isDashboard: () => boolean;
  openSidePanel: (panel: string, panelProps?: any) => void;
  toggleSidePanel: (panel: string, panelProps?: any) => void;
  clipboard: Clipboard;
  _t: TranslationFunction;
  focusableElement: FocusableElement;
}
