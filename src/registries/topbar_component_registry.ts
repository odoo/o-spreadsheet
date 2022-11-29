import { Registry } from "../registry";
import { SpreadsheetEnv } from "../types/env";

//------------------------------------------------------------------------------
// Topbar Component Registry
//------------------------------------------------------------------------------
export interface TopbarComponent {
  component: any;
  isVisible?: (env: SpreadsheetEnv) => boolean;
}

export const topbarComponentRegistry = new Registry<TopbarComponent>();
