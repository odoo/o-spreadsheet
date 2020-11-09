import { CommandDispatcher } from "./commands";
import { Env } from "@odoo/owl/dist/types/component/component";
import { TranslationFunction } from "../translation";
import { Getters } from "../plugins";

export interface SpreadsheetEnv extends Env {
  openSidePanel: (panel: string, panelProps?: any) => void;
  toggleSidePanel: (panel: string, panelProps?: any) => void;
  dispatch: CommandDispatcher["dispatch"];
  getters: Getters;
  clipboard: Clipboard;
  _t: TranslationFunction;
}
