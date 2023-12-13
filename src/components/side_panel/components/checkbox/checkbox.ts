import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../types";

interface Props {
  label?: string;
  value: any;
  className?: string;
  name?: string;
}

export class Checkbox extends Component<Props, SpreadsheetChildEnv> {
  static template = "o_spreadsheet.Checkbox";
}
