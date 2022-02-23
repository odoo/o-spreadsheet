import { Component, xml } from "@odoo/owl";
import { LINK_COLOR } from "../../constants";
import { toXC } from "../../helpers";
import { LinkCell, Position, SpreadsheetChildEnv } from "../../types";
import { css } from "../helpers/css";
import { EDIT, UNLINK } from "../icons";
import { Menu } from "../menu";
import { LinkEditorTerms } from "../side_panel/translations_terms";

const TEMPLATE = xml/* xml */ `
  <div class="o-link-tool">
    <t t-set="link" t-value="cell.link"/>
    <!-- t-key to prevent owl from re-using the previous img element when the link changes.
    The wrong/previous image would be displayed while the new one loads -->
    <img
      t-if="link.isExternal"
      t-key="link.url"
      width="16" height="16"
      t-attf-src="https://www.google.com/s2/favicons?sz=16&amp;domain={{link.url}}"
    />
    <a t-if="link.isExternal"
      class="o-link"
      t-att-href="link.url"
      target="_blank"
      t-on-click.prevent="openLink"
      t-att-title="link.url">
      <t t-esc="cell.urlRepresentation"/>
    </a>
    <a t-else=""
      class="o-link"
      t-on-click.prevent="openLink"
      t-att-title="cell.urlRepresentation">
      <t t-esc="cell.urlRepresentation"/>
    </a>
    <span class="o-link-icon o-unlink" t-on-click="unlink" title="${LinkEditorTerms.Remove}">${UNLINK}</span>
    <span class="o-link-icon o-edit-link" t-on-click="edit" title="${LinkEditorTerms.Edit}">${EDIT}</span>
  </div>
`;

css/* scss */ `
  .o-link-tool {
    font-size: 13px;
    background-color: white;
    box-shadow: 0 1px 4px 3px rgba(60, 64, 67, 0.15);
    padding: 12px;
    border-radius: 4px;
    display: flex;
    justify-content: space-between;

    img {
      margin-right: 3px;
    }

    a.o-link {
      color: #007bff;
      flex-grow: 2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    a.o-link:hover {
      text-decoration: underline;
      color: #0056b3;
      cursor: pointer;
    }
  }
  .o-link-icon {
    float: right;
    padding-left: 4%;
    .o-icon {
      height: 16px;
    }
  }
  .o-link-icon.o-unlink .o-icon {
    padding-top: 1px;
    height: 14px;
  }
  .o-link-icon:hover {
    cursor: pointer;
    color: #000;
  }
`;

export class LinkDisplay extends Component<{ cellPosition: Position }, SpreadsheetChildEnv> {
  static template = TEMPLATE;
  static components = { Menu };

  get cell(): LinkCell {
    const { col, row } = this.props.cellPosition;
    const sheetId = this.env.model.getters.getActiveSheetId();
    const cell = this.env.model.getters.getCell(sheetId, col, row);
    if (cell?.isLink()) {
      return cell;
    }
    throw new Error(
      `LinkDisplay Component can only be used with link cells. ${toXC(col, row)} is not a link.`
    );
  }

  openLink() {
    this.cell.action(this.env);
  }

  edit() {
    this.env.openLinkEditor(this.props.cellPosition);
  }

  unlink() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const [col, row] = this.env.model.getters.getPosition();
    const [mainCol, mainRow] = this.env.model.getters.getMainCell(sheetId, col, row);
    const style = this.cell.style;
    const textColor = style?.textColor === LINK_COLOR ? undefined : style?.textColor;
    this.env.model.dispatch("UPDATE_CELL", {
      col: mainCol,
      row: mainRow,
      sheetId,
      content: this.cell.link.label,
      style: { ...style, textColor, underline: undefined },
    });
  }
}
