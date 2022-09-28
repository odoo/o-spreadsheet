import { Component } from "@odoo/owl";
import { HEADER_HEIGHT, HEADER_WIDTH } from "../../constants";
import { FiguresContainer } from "../figures/container/container";

export class GridOverlay extends Component {
  static template = "o-spreadsheet-GridOverlay";
  static components = { FiguresContainer };

  get gridOverlayStyle() {
    return `
      top: ${this.env.isDashboard() ? 0 : HEADER_HEIGHT}px;
      left: ${this.env.isDashboard() ? 0 : HEADER_WIDTH}px;
      height: calc(100% - ${this.env.isDashboard() ? 0 : HEADER_HEIGHT}px);
      width: calc(100% - ${this.env.isDashboard() ? 0 : HEADER_WIDTH}px);
    `;
  }
}
