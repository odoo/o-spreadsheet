import type { SidePanelState } from "../components/side_panel/side_panel/side_panel_store";
import { Getters } from "../types/getters";
import { SpreadsheetChildEnv } from "../types/spreadsheet_env";
import { Registry } from "./registry";

//------------------------------------------------------------------------------
// Side Panel Registry
//------------------------------------------------------------------------------

/**
 * The registry is defined in its own module, without any reference to the side
 * panel components, to avoid a circular dependency between the side panel store
 * (which reads the registry) and the panel components (which use the store).
 * The registry content is declared in `side_panel_registry.ts`.
 */

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
