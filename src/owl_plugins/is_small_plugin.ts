import { computed, Plugin, usePlugin } from "@odoo/owl";
import { MOBILE_WIDTH_BREAKPOINT } from "../constants";
import { SpreadsheetRectPlugin } from "./spreadsheet_rect_plugin";

export class IsSmallPlugin extends Plugin {
  spreadsheetRect = usePlugin(SpreadsheetRectPlugin);

  isSmall = computed(() => {
    const rect = this.spreadsheetRect.rect();
    return rect.width && rect.width < MOBILE_WIDTH_BREAKPOINT;
  });
}
