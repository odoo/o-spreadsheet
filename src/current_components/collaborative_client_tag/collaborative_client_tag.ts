import { Component } from "@odoo/owl";
import { DEFAULT_FONT_SIZE } from "../../constants";
import { Color, HeaderIndex, SpreadsheetChildEnv } from "../../types";
import { css, cssPropertiesToCss } from "../helpers/css";

interface ClientTagProps {
  active: boolean;
  name: string;
  color: Color;
  col: HeaderIndex;
  row: HeaderIndex;
}

css/* scss */ `
  .o-client-tag {
    position: absolute;
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
    font-size: ${DEFAULT_FONT_SIZE};
    color: white;
    pointer-events: none;
  }
`;
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
    });
  }
}
