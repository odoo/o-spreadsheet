import * as owl from "@odoo/owl";
import { hasLink } from "../../helpers";
import { LinkCell, SpreadsheetEnv } from "../../types";
import { EDIT, UNLINK } from "../icons";
import { Menu } from "../menu";
const { Component, tags } = owl;
const { xml, css } = tags;

const TEMPLATE = xml/* xml */ `
    <div class="o-link-tool" t-on-click.stop="">
      <t t-set="link" t-value="cell.link"/>
      <a t-att-href="link.url" target="_blank" t-on-click.prevent="openLink">
        <t t-esc="cell.urlRepresentation"/>
      </a>
      <span class="o-link-icon" t-on-click="unlink">${UNLINK}</span>
      <span class="o-link-icon" t-on-click="edit">${EDIT}</span>
    </div>
    `;

const CSS = css/* scss */ `
  .o-link-tool {
    font-size: 13px;
    background-color: white;
    box-shadow: 0 1px 4px 3px rgba(60, 64, 67, 0.15);
    margin: 2px 10px 2px 10px;
    padding: 10px;
  }
  .o-link-icon {
    float: right;
    padding-left: 4%;
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

  get cell(): LinkCell {
    const [col, row] = this.getters.getPosition();
    const sheetId = this.getters.getActiveSheetId();
    const [mainCol, mainRow] = this.getters.getMainCell(sheetId, col, row);
    const cell = this.getters.getCell(sheetId, mainCol, mainRow);
    if (hasLink(cell)) {
      return cell;
    }
    throw new Error("LinkDisplay Component can only be used with link cells");
  }

  openLink() {
    this.cell.action(this.env);
    this.trigger("close");
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
      content: this.cell.link.label,
    });
    this.trigger("close");
  }
}
