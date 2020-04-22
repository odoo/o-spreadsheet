import { Registry } from "../../registry";
import { ConditionalFormattingPanel } from "./conditional_formatting";
import { SpreadsheetEnv } from "../../types";

//------------------------------------------------------------------------------
// Side Panel Registry
//------------------------------------------------------------------------------
interface SidePanelContent {
  title: string | ((env: SpreadsheetEnv) => string);
  Body: any;
  Footer?: any;
}

export const sidePanelRegistry = new Registry<SidePanelContent>();

sidePanelRegistry.add("ConditionalFormatting", {
  title: "Conditional Formatting",
  Body: ConditionalFormattingPanel,
});
