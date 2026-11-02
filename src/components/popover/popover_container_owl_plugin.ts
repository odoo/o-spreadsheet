import { Plugin, useConfig, usePlugin } from "@odoo/owl";
import { SpreadsheetRectPlugin } from "../../owl_plugins/spreadsheet_rect_plugin";
import { Rect } from "../../types/rendering";

export class PopoverContainerPlugin extends Plugin {
  private spreadsheetRect = usePlugin(SpreadsheetRectPlugin);
  private customGetContainerRect: (() => Rect) | undefined = useConfig("getPopoverContainerRect");

  /**
   * Rect inside which a popover should stay. By default, the rect of the spreadsheet,
   * unless the config `getPopoverContainerRect` is given.
   */
  getContainerRect(): Rect {
    return this.customGetContainerRect?.() ?? this.spreadsheetRect.rect();
  }
}
