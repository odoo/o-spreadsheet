import { Registry } from "../registry";
import { SpreadsheetChildEnv } from "../types/env";

//------------------------------------------------------------------------------
// Topbar Component Registry
//------------------------------------------------------------------------------
interface TopbarComponent {
  component: any;
  isVisible?: (env: SpreadsheetChildEnv) => boolean;
}

export const topbarComponentRegistry = new Registry<TopbarComponent>();
