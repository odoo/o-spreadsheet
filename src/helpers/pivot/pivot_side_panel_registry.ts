import { Component } from "@odoo/owl";
import { PivotSpreadsheetSidePanel } from "../../components/side_panel/pivot/pivot_side_panel/pivot_spreadsheet_side_panel/pivot_spreadsheet_side_panel";
import { SpreadsheetPivotGroupEditor } from "../../components/side_panel/pivot/spreadshet_pivot_group_editor/spreadshet_pivot_group_editor";
import { Registry } from "../../registries/registry";

export interface PivotRegistryItem {
  editor: new (...args: any) => Component;
  fieldGroupEditor?: new (...args: any) => Component;
}

export const pivotComponentsRegistry = new Registry<PivotRegistryItem>();

pivotComponentsRegistry.add("SPREADSHEET", {
  editor: PivotSpreadsheetSidePanel,
  fieldGroupEditor: SpreadsheetPivotGroupEditor,
});
