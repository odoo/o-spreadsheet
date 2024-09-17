import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../types";

interface Props {
  class?: string;
}

export class Section extends Component<Props, SpreadsheetChildEnv> {
  static template = "o_spreadsheet.Section";
  static props = {
    class: { type: String, optional: true },
    slots: Object,
  };
}
