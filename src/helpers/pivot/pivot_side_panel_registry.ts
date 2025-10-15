import { Registry } from "@odoo/o-spreadsheet-engine/registries/registry";
import { Component } from "@odoo/owl";
import { PivotSpreadsheetSidePanel } from "../../components/side_panel/pivot/pivot_side_panel/pivot_spreadsheet_side_panel/pivot_spreadsheet_side_panel";

export interface PivotRegistryItem {
  editor: new (...args: any) => Component;
}

export const pivotSidePanelRegistry = new Registry<PivotRegistryItem>();

pivotSidePanelRegistry.add("SPREADSHEET", {
  editor: PivotSpreadsheetSidePanel,
});
