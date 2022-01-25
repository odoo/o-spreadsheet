import { Model } from "..";
import { TranslationFunction } from "../translation";

export interface SpreadsheetEnv {
  notifyUser: (content: string) => any;
  askConfirmation: (content: string, confirm: () => any, cancel?: () => any) => any;
  editText: (title: string, placeholder: string, callback: (text: string | null) => any) => any;
}

export interface SpreadsheetChildEnv extends SpreadsheetEnv {
  model: Model;
  openSidePanel: (panel: string, panelProps?: any) => void;
  openLinkEditor: () => void;
  toggleSidePanel: (panel: string, panelProps?: any) => void;
  clipboard: Clipboard;
  _t: TranslationFunction;
}
