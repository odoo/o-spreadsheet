import { Env } from "@odoo/owl/dist/types/component/component";
import { LinkEditorProps } from "../components/link_editor";
import { TranslationFunction } from "../translation";
import { CommandDispatcher } from "./commands";
import { Getters } from "./getters";

export interface SpreadsheetEnv extends Env {
  openSidePanel: (panel: string, panelProps?: any) => void;
  openLinkEditor: (props: LinkEditorProps) => void;
  toggleSidePanel: (panel: string, panelProps?: any) => void;
  dispatch: CommandDispatcher["dispatch"];
  getters: Getters;
  clipboard: Clipboard;
  _t: TranslationFunction;
}
