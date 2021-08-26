import * as owl from "@odoo/owl";
import { DEFAULT_FONT_SIZE } from "../constants";
import { SpreadsheetEnv, Viewport } from "../types";

const { Component } = owl;
const { css, xml } = owl.tags;

interface ClientTagProps {
  active: boolean;
  name: string;
  color: string;
  col: number;
  row: number;
  viewport: Viewport;
}

const TEMPLATE = xml/* xml */ `
  <div>
    <div
      class="o-client-tag"
      t-att-style="tagStyle"
      t-esc="props.name"
    />
  </div>
`;

const CSS = css/* scss */ `
  .o-client-tag {
    position: absolute;
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
    font-size: ${DEFAULT_FONT_SIZE};
    color: white;
    opacity: 0;
    pointer-events: none;
  }
`;
export class ClientTag extends Component<ClientTagProps, SpreadsheetEnv> {
  static template = TEMPLATE;

  static style = CSS;

  get tagStyle(): string {
    const { col, row, color } = this.props;
    const viewport = this.env.getters.getActiveViewport();
    const { height } = this.env.getters.getViewportDimension();
    const [x, y, ,] = this.env.getters.getCanvasRect(
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
