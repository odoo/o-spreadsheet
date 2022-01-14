import { Env } from "@odoo/owl/dist/types/app/app";
import { UuidGenerator } from "../helpers";
import { TranslationFunction } from "../translation";
import { CommandDispatcher } from "./commands";
import { Getters } from "./getters";

export interface SpreadsheetEnv extends Env {
  notifyUser: (content: string) => any;
  askConfirmation: (content: string, confirm: () => any, cancel?: () => any) => any;
  editText: (title: string, placeholder: string, callback: (text: string | null) => any) => any;
  openSidePanel: (panel: string, panelProps?: any) => void;
  openLinkEditor: () => void;
  toggleSidePanel: (panel: string, panelProps?: any) => void;
  dispatch: CommandDispatcher["dispatch"];
  getters: Getters;
  uuidGenerator: UuidGenerator;
  clipboard: Clipboard;
  _t: TranslationFunction;
}
