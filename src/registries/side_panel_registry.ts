import { ChartPanel } from "../components/side_panel/chart_panel";
import { ConditionalFormattingPanel } from "../components/side_panel/conditional_formatting/conditional_formatting";
import { FindAndReplacePanel } from "../components/side_panel/find_and_replace";
import { Registry } from "../registry";
import { _lt } from "../translation";
import { SpreadsheetChildEnv } from "../types";

//------------------------------------------------------------------------------
// Side Panel Registry
//------------------------------------------------------------------------------
export interface SidePanelContent {
  title: string | ((env: SpreadsheetChildEnv) => string);
  Body: any;
  Footer?: any;
}

export const sidePanelRegistry = new Registry<SidePanelContent>();

sidePanelRegistry.add("ConditionalFormatting", {
  title: _lt("Conditional formatting"),
  Body: ConditionalFormattingPanel,
});

sidePanelRegistry.add("ChartPanel", {
  title: _lt("Chart"),
  Body: ChartPanel,
});

sidePanelRegistry.add("FindAndReplace", {
  title: _lt("Find and Replace"),
  Body: FindAndReplacePanel,
});
