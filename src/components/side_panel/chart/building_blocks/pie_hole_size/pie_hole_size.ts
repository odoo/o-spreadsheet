import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../../types";
import { Section } from "../../../components/section/section";

interface Props {
  title: string;
  onValueChange: (value: number) => void;
  value: number;
}

export class PieHoleSize extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.PieHoleSize";
  static components = { Section };
  static props = { title: String, onValueChange: Function, value: Number };
}
