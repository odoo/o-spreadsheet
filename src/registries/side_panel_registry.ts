import { ChartPanel } from "../components/side_panel/chart/main_chart_panel/main_chart_panel";
import { ConditionalFormattingPanel } from "../components/side_panel/conditional_formatting/conditional_formatting";
import { CustomCurrencyPanel } from "../components/side_panel/custom_currency/custom_currency";
import { FindAndReplacePanel } from "../components/side_panel/find_and_replace/find_and_replace";
import { SettingsPanel } from "../components/side_panel/settings/settings_panel";
import { SplitIntoColumnsPanel } from "../components/side_panel/split_to_columns_panel/split_to_columns_panel";
import { _t } from "../translation";
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
  title: _t("Conditional formatting"),
  Body: ConditionalFormattingPanel,
});

sidePanelRegistry.add("ChartPanel", {
  title: _t("Chart"),
  Body: ChartPanel,
});

sidePanelRegistry.add("FindAndReplace", {
  title: _t("Find and Replace"),
  Body: FindAndReplacePanel,
});

sidePanelRegistry.add("CustomCurrency", {
  title: _t("Custom currency format"),
  Body: CustomCurrencyPanel,
});

sidePanelRegistry.add("SplitToColumns", {
  title: _t("Split text into columns"),
  Body: SplitIntoColumnsPanel,
});

sidePanelRegistry.add("Settings", {
  title: _t("Spreadsheet settings"),
  Body: SettingsPanel,
});
