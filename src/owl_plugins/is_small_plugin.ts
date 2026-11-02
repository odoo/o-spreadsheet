import { computed, Plugin, usePlugin } from "@odoo/owl";
import { MOBILE_WIDTH_BREAKPOINT } from "../constants";
import { SpreadsheetRectPlugin } from "./spreadsheet_rect_plugin";

export class IsSmallPlugin extends Plugin {
  spreadsheetRectPlugin = usePlugin(SpreadsheetRectPlugin);

  isSmall = computed(() => {
    const rect = this.spreadsheetRectPlugin.rect();
    return rect.width && rect.width < MOBILE_WIDTH_BREAKPOINT;
  });
}
