import * as owl from "@odoo/owl";
import { BOTTOMBAR_HEIGHT, SCROLLBAR_WIDTH } from "../constants";
import { Position, SpreadsheetEnv } from "../types";
const { Component, tags } = owl;
const { xml, css } = tags;

const TEMPLATE = xml/* xml */ `
  <div t-att-style="style">
    <t t-slot="default"/>
  </div>
`;

const CSS = css/* scss */ ``;

interface Props {
  position: Position;
  width: number;
  height: number;
}

export class CellComponent extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;
  private getters = this.env.getters;

  get style() {
    const { col, row } = this.props.position;
    console.log(this.props);
    const [leftCol, bottomRow] = this.getters.getBottomLeftCell(
      this.getters.getActiveSheetId(),
      col,
      row
    );
    const viewport = this.getters.getActiveSnappedViewport();
    const { width: viewportWidth, height: viewportHeight } = this.getters.getViewportDimension();
    const [x, y, width, height] = this.getters.getRect(
      { left: leftCol, top: bottomRow, right: leftCol, bottom: bottomRow },
      viewport
    );
    const hAlign = x + this.props.width + 30 < viewportWidth ? "left" : "right";
    const hOffset =
      hAlign === "left" ? x + 1 : viewportWidth - x + (SCROLLBAR_WIDTH + 2) - width + 1;
    let vAlign = y + this.props.height + height + 20 < viewportHeight ? "top" : "bottom";
    const vOffset =
      vAlign === "top"
        ? y + height + 2
        : viewportHeight - y + (SCROLLBAR_WIDTH + 2) + 2 + BOTTOMBAR_HEIGHT;
    return `
      position: absolute;
      ${hAlign}:${hOffset}px;
      ${vAlign}:${vOffset}px;
      width:${this.props.width};
      height:${this.props.height};
    `;
  }
}
