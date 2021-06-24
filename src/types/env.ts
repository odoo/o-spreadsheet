import { Env } from "@odoo/owl/dist/types/component/component";
import { UuidGenerator } from "../helpers";
import { TranslationFunction } from "../translation";
import { CommandDispatcher } from "./commands";
import { Getters } from "./getters";

export interface SpreadsheetEnv extends Env {
  openSidePanel: (panel: string, panelProps?: any) => void;
  toggleSidePanel: (panel: string, panelProps?: any) => void;
  dispatch: CommandDispatcher["dispatch"];
  getters: Getters;
  uuidGenerator: UuidGenerator;
  clipboard: Clipboard;
  _t: TranslationFunction;
}
