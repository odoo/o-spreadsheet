import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../types";

interface Props {
  title?: string;
  class?: string;
}

export class Section extends Component<Props, SpreadsheetChildEnv> {
  static template = "o_spreadsheet.Section";
}

Section.props = {
  title: { type: String, optional: true },
  class: { type: String, optional: true },
  slots: { type: Object, optional: true },
};
