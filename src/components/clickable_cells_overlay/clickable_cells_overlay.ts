import { toRaw, usePlugin } from "@odoo/owl";
import { Rect } from "../../types/rendering";
import { ClickableCell, ClickableCellsPlugin } from "../dashboard/clickable_cell_owl_plugin";
import { cssPropertiesToCss } from "../helpers/css";
import { isMiddleClickOrCtrlClick } from "../helpers/dom_helpers";
import { OSComponent } from "../os_component";

export class ClickableCellsOverlay extends OSComponent {
  static template = "o-spreadsheet-ClickableCellsOverlay";
  static components = {};

  private clickableCellsPlugin = usePlugin(ClickableCellsPlugin);

  getCellClickableStyle(coordinates: Rect) {
    return cssPropertiesToCss({
      top: `${coordinates.y}px`,
      left: `${coordinates.x}px`,
      width: `${coordinates.width}px`,
      height: `${coordinates.height}px`,
    });
  }

  /**
   * Get all the boxes for the cell in the sheet view that are clickable.
   * This function is used to render an overlay over each clickable cell in
   * order to display a pointer cursor.
   *
   */
  getClickableCells(): ClickableCell[] {
    return toRaw(this.clickableCellsPlugin.clickableCells);
  }

  selectClickableCell(ev: MouseEvent, clickableCell: ClickableCell) {
    if (![0, 1].includes(ev.button)) {
      return;
    }
    const { position, action } = clickableCell;
    action(position, this.spEnv, isMiddleClickOrCtrlClick(ev));
  }
}
