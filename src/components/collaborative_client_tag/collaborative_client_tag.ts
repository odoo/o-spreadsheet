import { cssPropertiesToCss } from "../helpers/css";

import { useProps } from "@odoo/owl";
import { useStore } from "../../store_engine/store_hooks";
import { ViewportsStore } from "../../stores/viewports_store";
import { Store } from "../../types/store_engine";
import { types } from "../props_validation";
import { SpreadsheetComponent } from "../spreadsheet/spreadsheet_component";

export class ClientTag extends SpreadsheetComponent {
  static template = "o-spreadsheet-ClientTag";

  private viewStore!: Store<ViewportsStore>;

  setup() {
    this.viewStore = useStore(ViewportsStore);
  }

  protected props = useProps({
    active: types.boolean(),
    name: types.string(),
    color: types.Color(),
    col: types.HeaderIndex(),
    row: types.HeaderIndex(),
  });
  get tagStyle(): string {
    const { col, row, color } = this.props;
    const { height } = this.viewStore.sheetViewDimensionWithHeaders;
    const sheetId = this.viewStore.displayedSheetId;
    const visible = this.viewStore.viewports.isVisibleInViewport({ sheetId, col, row });
    const { x, y } = this.viewStore.viewports.getVisibleRect(sheetId, {
      left: col,
      top: row,
      right: col,
      bottom: row,
    });

    return cssPropertiesToCss({
      bottom: `${height - y + 15}px`,
      left: `${x - 1}px`,
      border: `1px solid ${color}`,
      "background-color": color,
      visibility: visible ? "visible" : "hidden",
    });
  }
}
