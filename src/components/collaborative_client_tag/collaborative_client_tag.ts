import { Component } from "@odoo/owl";
import { Color, HeaderIndex, SpreadsheetChildEnv } from "../../types";
import { cssPropertiesToCss } from "../helpers/css";

interface ClientTagProps {
  active: boolean;
  name: string;
  color: Color;
  col: HeaderIndex;
  row: HeaderIndex;
}

export class ClientTag extends Component<ClientTagProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ClientTag";
  static props = {
    active: Boolean,
    name: String,
    color: String,
    col: Number,
    row: Number,
  };
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
