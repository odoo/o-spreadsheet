import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { ValidationMessages } from "../../../../validation_messages/validation_messages";
import { Section } from "../../../components/section/section";

import { Component } from "../../../../../owl3_compatibility_layer";
interface Props {
  messages: string[];
}

export class ChartErrorSection extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.ChartErrorSection";
  static components = { Section, ValidationMessages };
  static props = { messages: { type: Array, element: String } };
}
