import { Registry } from "../registry";
import { ConditionalFormattingPanel } from "../components/side_panel/conditional_formatting";
import { SpreadsheetEnv } from "../types";

//------------------------------------------------------------------------------
// Side Panel Registry
//------------------------------------------------------------------------------
export interface SidePanelContent {
  title: string | ((env: SpreadsheetEnv) => string);
  Body: any;
  Footer?: any;
}

export const sidePanelRegistry = new Registry<SidePanelContent>();

sidePanelRegistry.add("ConditionalFormatting", {
  title: "Conditional formatting",
  Body: ConditionalFormattingPanel,
});
