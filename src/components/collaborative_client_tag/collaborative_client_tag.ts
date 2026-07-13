import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { cssPropertiesToCss } from "../helpers/css";

import { useProps } from "@odoo/owl";
import { Component } from "../../owl3_compatibility_layer";
import { types } from "../props_validation";

export class ClientTag extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ClientTag";

  protected props = useProps({
    active: types.boolean(),
    name: types.string(),
    color: types.Color(),
    col: types.HeaderIndex(),
    row: types.HeaderIndex(),
  });
  get tagStyle(): string {
    const { col, row, color } = this.props;
    const { height } = this.env.model.getters.getSheetViewDimensionWithHeaders();
    const visible = this.env.model.getters.isVisibleInViewport({
      sheetId: this.env.model.getters.getActiveSheetId(),
      col,
      row,
    });
    const { x, y } = this.env.model.getters.getVisibleRect({
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
