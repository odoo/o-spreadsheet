import { ChartPanel } from "../components/side_panel/chart/main_chart_panel/main_chart_panel";
import { ConditionalFormattingPanel } from "../components/side_panel/conditional_formatting/conditional_formatting";
import { CustomCurrencyPanel } from "../components/side_panel/custom_currency/custom_currency";
import { FindAndReplacePanel } from "../components/side_panel/find_and_replace/find_and_replace";
import { SplitIntoColumnsPanel } from "../components/side_panel/split_to_columns_panel/split_to_columns_panel";
import { _lt } from "../translation";
import { SpreadsheetChildEnv } from "../types";
import { Registry } from "./registry";

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

sidePanelRegistry.add("CustomCurrency", {
  title: _lt("Custom currency format"),
  Body: CustomCurrencyPanel,
});

sidePanelRegistry.add("SplitToColumns", {
  title: _lt("Split text into columns"),
  Body: SplitIntoColumnsPanel,
});
