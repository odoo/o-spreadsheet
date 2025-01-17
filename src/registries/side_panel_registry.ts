import { SidePanelState } from "../components/side_panel/side_panel/side_panel_store";
import { Getters, SpreadsheetChildEnv } from "../types";
import { Registry } from "./registry";

//------------------------------------------------------------------------------
// Side Panel Registry
//------------------------------------------------------------------------------

export interface SidePanelContent {
  title: string | ((env: SpreadsheetChildEnv, props: object) => string);
  Body: any;
  Footer?: any;
  /**
   * A callback used to validate the props or generate new props
   * based on the current state of the spreadsheet model, using the getters.
   */
  computeState?: (getters: Getters, initialProps: object) => SidePanelState;
}

export const sidePanelRegistry = new Registry<SidePanelContent>();
