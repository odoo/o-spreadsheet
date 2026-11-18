import { cssPropertiesToCss } from "../helpers/css";
import { OSComponent } from "../os_component";

import { usePlugin, useProps } from "@odoo/owl";
import { ViewportsPlugin, ViewportsPluginInstance } from "../../owl_plugins/viewports_owl_plugin";
import { types } from "../props_validation";

export class ClientTag extends OSComponent {
  static template = "o-spreadsheet-ClientTag";

  private viewStore!: ViewportsPluginInstance;

  setup() {
    this.viewStore = usePlugin(ViewportsPlugin);
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
    const visible = this.viewStore.viewports().isVisibleInViewport({ sheetId, col, row });
    const { x, y } = this.viewStore.viewports().getVisibleRect(sheetId, {
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
