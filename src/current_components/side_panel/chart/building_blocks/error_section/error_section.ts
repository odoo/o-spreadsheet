import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../../types";
import { ValidationMessages } from "../../../../validation_messages/validation_messages";
import { Section } from "../../../components/section/section";

interface Props {
  messages: string[];
}

export class ChartErrorSection extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.ChartErrorSection";
  static components = { Section, ValidationMessages };
  static props = { messages: { type: Array, element: String } };
}
