import { Registry } from "@odoo/o-spreadsheet-engine/registries/registry";
import { PivotSpreadsheetSidePanel } from "../../components/side_panel/pivot/pivot_side_panel/pivot_spreadsheet_side_panel/pivot_spreadsheet_side_panel";

import { Component } from "../../owl3_compatibility_layer";
export interface PivotRegistryItem {
  editor: new (...args: any) => Component;
}

export const pivotSidePanelRegistry = new Registry<PivotRegistryItem>();

pivotSidePanelRegistry.add("SPREADSHEET", {
  editor: PivotSpreadsheetSidePanel,
});
