import * as owl from "@odoo/owl";
import { SCROLLBAR_WIDTH } from "../../constants";
import { hasLink } from "../../helpers";
import { Link, SpreadsheetEnv } from "../../types";
import { EDIT, UNLINK } from "../icons";
import { Menu } from "./../menu";
const { Component, tags } = owl;
const { xml, css } = tags;

const LINK_TOOLTIP_HEIGHT = 23;
const LINK_TOOLTIP_WIDTH = 200;

const TEMPLATE = xml/* xml */ `
    <div class="o-link-tool"  t-att-style="style" t-on-click.stop="">
      <a t-att-href="link.url" target="_blank">
        <t t-esc="link.url"/>
      </a>
      <span class="o-link-icon" t-on-click="unlink">${UNLINK}</span>
      <span class="o-link-icon" t-on-click="edit">${EDIT}</span>
    </div>
    `;

const CSS = css/* scss */ `
  .o-link-tool {
    width: ${LINK_TOOLTIP_WIDTH};
    height: ${LINK_TOOLTIP_HEIGHT};
    position: absolute;
    font-size: 13px;
    background-color: white;
    box-shadow: 0 1px 4px 3px rgba(60, 64, 67, 0.15);
    padding: 10px;
  }
  .o-link-icon {
    float: right;
    padding-left: 1%;
  }
  .o-link-icon:hover {
    cursor: pointer;
  }
`;

export class LinkDisplay extends Component<{}, SpreadsheetEnv> {
  static template = TEMPLATE;
  static components = { Menu };
  static style = CSS;
  private getters = this.env.getters;

  get link(): Link {
    const [col, row] = this.getters.getPosition();
    const sheetId = this.getters.getActiveSheetId();
    const [mainCol, mainRow] = this.getters.getMainCell(sheetId, col, row);
    const cell = this.getters.getCell(sheetId, mainCol, mainRow);
    if (hasLink(cell)) {
      return { url: cell.link.url, label: cell.formattedValue };
    }
    return { url: "", label: "" };
  }

  get style() {
    const [col, row] = this.getters.getPosition();
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
    const hAlign = x + LINK_TOOLTIP_WIDTH + 30 < viewportWidth ? "left" : "right";
    const hOffset =
      hAlign === "left" ? x + 10 : viewportWidth - x + (SCROLLBAR_WIDTH + 2) - width + 10;
    let vAlign = y + LINK_TOOLTIP_HEIGHT + height < viewportHeight ? "top" : "bottom";
    const vOffset = vAlign === "top" ? y + height + 2 : viewportHeight - y + (SCROLLBAR_WIDTH + 2);
    return `${hAlign}:${hOffset}px;${vAlign}:${vOffset}px;`;
  }

  edit() {
    const [col, row] = this.getters.getPosition();
    this.env.openLinkEditor({ position: { col, row } });
  }

  unlink() {
    const [col, row] = this.getters.getPosition();
    const [mainCol, mainRow] = this.getters.getMainCell(this.getters.getActiveSheetId(), col, row);
    this.env.dispatch("UPDATE_CELL", {
      col: mainCol,
      row: mainRow,
      sheetId: this.getters.getActiveSheetId(),
      content: this.link.label,
    });
    this.trigger("close");
  }
}
