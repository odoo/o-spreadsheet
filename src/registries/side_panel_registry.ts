import { Registry } from "../registry";
import { ConditionalFormattingPanel } from "../components/side_panel/conditional_formatting";
import { FindAndReplacePanel } from "../components/side_panel/find_and_replace";
import { SpreadsheetEnv } from "../types";
import { ChartPanel } from "../components/side_panel/chart_panel";
import { _lt } from "../translation";
import { CollaborativeDebugPanel } from "../components/side_panel/collaborative_debug_panel";

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

sidePanelRegistry.add("CollaborativeDebug", {
  title: "Collaborative Debug",
  Body: CollaborativeDebugPanel,
});
