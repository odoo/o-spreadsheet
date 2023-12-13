import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../types";

interface Props {
  title?: string;
  className?: string;
}

export class Section extends Component<Props, SpreadsheetChildEnv> {
  static template = "o_spreadsheet.Section";
}
