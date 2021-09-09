import { Env } from "@odoo/owl/dist/types/component/component";
import { UuidGenerator } from "../helpers";
import { ModelBus } from "../helpers/event_bus";
import { TranslationFunction } from "../translation";
import { CommandDispatcher } from "./commands";
import { Getters } from "./getters";

export interface SpreadsheetEnv extends Env {
  openSidePanel: (panel: string, panelProps?: any) => void;
  openLinkEditor: () => void;
  toggleSidePanel: (panel: string, panelProps?: any) => void;
  dispatch: CommandDispatcher["dispatch"];
  modelBus: ModelBus;
  getters: Getters;
  uuidGenerator: UuidGenerator;
  clipboard: Clipboard;
  _t: TranslationFunction;
}
