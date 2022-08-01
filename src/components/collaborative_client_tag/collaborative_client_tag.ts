import { Component } from "@odoo/owl";
import { DEFAULT_FONT_SIZE } from "../../constants";
import { HeaderIndex, SpreadsheetChildEnv, Viewport } from "../../types";
import { css } from "../helpers/css";

interface ClientTagProps {
  active: boolean;
  name: string;
  color: string;
  col: HeaderIndex;
  row: HeaderIndex;
  viewport: Viewport;
}

css/* scss */ `
  .o-client-tag {
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
    font-size: ${DEFAULT_FONT_SIZE};
  }
`;
export class ClientTag extends Component<ClientTagProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ClientTag";
  get tagStyle(): string {
    const { col, row, color } = this.props;
    const viewport = this.env.model.getters.getActiveViewport();
    const { height } = this.env.model.getters.getViewportDimensionWithHeaders();
    const { x, y } = this.env.model.getters.getRect(
      { left: col, top: row, right: col, bottom: row },
      viewport
    );
    return `bottom: ${height - y + 15}px;left: ${
      x - 1
    }px;border: 1px solid ${color};background-color: ${color};${
      this.props.active ? "opacity:1 !important" : ""
    }`;
  }
}
