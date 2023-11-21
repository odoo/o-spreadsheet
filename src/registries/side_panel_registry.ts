import { ChartPanel } from "../components/side_panel/chart/main_chart_panel/main_chart_panel";
import { ConditionalFormattingPanel } from "../components/side_panel/conditional_formatting/conditional_formatting";
import { CustomCurrencyPanel } from "../components/side_panel/custom_currency/custom_currency";
import { DataValidationEditor } from "../components/side_panel/data_validation/dv_editor/dv_editor";
import { FindAndReplacePanel } from "../components/side_panel/find_and_replace/find_and_replace";
import { MoreFormatsPanel } from "../components/side_panel/more_formats/more_formats";
import { RemoveDuplicatesPanel } from "../components/side_panel/remove_duplicates/remove_duplicates";
import { SettingsPanel } from "../components/side_panel/settings/settings_panel";
import { SplitIntoColumnsPanel } from "../components/side_panel/split_to_columns_panel/split_to_columns_panel";
import { _t } from "../translation";
import { SpreadsheetChildEnv } from "../types";
import { DataValidationPanel } from "./../components/side_panel/data_validation/data_validation_panel";
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

sidePanelRegistry.add("RemoveDuplicates", {
  title: _t("Remove duplicates"),
  Body: RemoveDuplicatesPanel,
});

sidePanelRegistry.add("DataValidation", {
  title: _t("Data validation"),
  Body: DataValidationPanel,
});

sidePanelRegistry.add("DataValidationEditor", {
  title: _t("Data validation"),
  Body: DataValidationEditor,
});

sidePanelRegistry.add("MoreFormats", {
  title: _t("More date formats"),
  Body: MoreFormatsPanel,
});
