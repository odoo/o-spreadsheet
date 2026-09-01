import { PivotSpreadsheetSidePanel } from "../../components/side_panel/pivot/pivot_side_panel/pivot_spreadsheet_side_panel/pivot_spreadsheet_side_panel";
import { Registry } from "../../registries/registry";

import { ComponentConstructor } from "@odoo/owl";
export interface PivotRegistryItem {
  editor: ComponentConstructor;
}

export const pivotSidePanelRegistry = new Registry<PivotRegistryItem>();

pivotSidePanelRegistry.add("SPREADSHEET", {
  editor: PivotSpreadsheetSidePanel,
});
