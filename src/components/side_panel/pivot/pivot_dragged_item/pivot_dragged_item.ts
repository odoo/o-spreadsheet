import { cssPropertiesToCss } from "@odoo/o-spreadsheet-engine/components/helpers/css";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component } from "@odoo/owl";
import { Store, useStore } from "../../../../store_engine";
import { PivotDragAndDropStore } from "../../../../stores/pivot_drag_and_drop_store";
import { useSpreadsheetRect } from "../../../helpers/position_hook";
import { PivotFacet } from "../../../pivot_overlay/pivot_facet/pivot_facet";

export class PivotDraggedItem extends Component<{}, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotDraggedItem";
  static props = {};
  static components = { PivotFacet };

  private spreadsheetRect = useSpreadsheetRect();

  pivotDragAndDropStore!: Store<PivotDragAndDropStore>;

  setup() {
    this.pivotDragAndDropStore = useStore(PivotDragAndDropStore);
  }

  get draggedPivotItemStyle() {
    if (!this.pivotDragAndDropStore.draggedItem || !this.pivotDragAndDropStore.itemPosition) {
      return "";
    }
    const { x, y } = this.pivotDragAndDropStore.itemPosition;
    return cssPropertiesToCss({
      left: `${x - this.spreadsheetRect.x}px`,
      top: `${y - this.spreadsheetRect.y}px`,
    });
  }
}
