import { ChartPanel } from "../components/side_panel/chart_panel";
import { ConditionalFormattingPanel } from "../components/side_panel/conditional_formatting";
import { Registry } from "../registry";
import { _lt } from "../translation";
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
  title: _lt("Conditional formatting"),
  Body: ConditionalFormattingPanel,
});

sidePanelRegistry.add("ChartPanel", {
  title: _lt("Chart"),
  Body: ChartPanel,
});
