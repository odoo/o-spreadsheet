import * as owl from "@odoo/owl";
import { CellPosition, Link, SpreadsheetEnv } from "../../types";
import { LinkEditorTerms } from "./translations_terms";

const { Component, tags, useState } = owl;
const { xml } = tags;

const TEMPLATE = xml/* xml */ `
  <div>
    <div class="o-section">
        <label>
          <span><t t-esc="env._t('${LinkEditorTerms.Label}')"/></span>
          <input t-model="link.label" />
        </label>

        <label>
          <span><t t-esc="env._t('${LinkEditorTerms.Link}')"/></span>
          <input t-model="link.url" />
        </label>
      <div class="o-sidePanelButtons">
        <button t-on-click="save" class="o-sidePanelButton" t-esc="env._t('${LinkEditorTerms.Confirm}')"></button>
      </div>
    </div>
  </div>
`;
interface Props {
  position: CellPosition;
  link: Link;
}

export class LinkEditor extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static defaultProps = {
    link: { label: "", url: "" },
  };
  private link: Link = useState({ ...this.props.link });

  save() {
    this.env.dispatch("UPDATE_CELL", {
      col: this.props.position.col,
      row: this.props.position.row,
      sheetId: this.props.position.sheetId,
      content: `[${this.link.label}](${this.link.url})`,
    });
    this.trigger("close-side-panel");
  }
}
