import { toRaw } from "@odoo/owl";
import { Component } from "../../owl3_compatibility_layer";
import { useStore } from "../../store_engine/store_hooks";
import { DOMCoordinates, Rect } from "../../types/rendering";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { Store } from "../../types/store_engine";
import { ClickableCell, ClickableCellsStore } from "../dashboard/clickable_cell_store";
import { DelayedHoveredCellStore } from "../grid/delayed_hovered_cell_store";
import { cssPropertiesToCss } from "../helpers/css";
import { isMiddleClickOrCtrlClick } from "../helpers/dom_helpers";
import { CellPopoverStore } from "../popover/cell_popover_store";

export class ClickableCellsOverlay extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ClickableCellsOverlay";
  static components = {};

  protected cellPopovers!: Store<CellPopoverStore>;

  onMouseWheel!: (ev: WheelEvent) => void;
  canvasPosition!: DOMCoordinates;
  hoveredCell!: Store<DelayedHoveredCellStore>;
  clickableCellsStore!: Store<ClickableCellsStore>;

  setup() {
    this.hoveredCell = useStore(DelayedHoveredCellStore);
    this.clickableCellsStore = useStore(ClickableCellsStore);
  }

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
    return toRaw(this.clickableCellsStore.clickableCells);
  }

  selectClickableCell(ev: MouseEvent, clickableCell: ClickableCell) {
    const { position, action } = clickableCell;
    action(position, this.env, isMiddleClickOrCtrlClick(ev));
  }
}
