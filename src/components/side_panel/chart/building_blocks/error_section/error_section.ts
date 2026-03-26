import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { Section } from "../../../components/section/section";

import { Component } from "../../../../../owl3_compatibility_layer";
import { ValidationMessages } from "../../../../validation_messages/validation_messages";
interface Props {
  messages: string[];
}

export class ChartErrorSection extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.ChartErrorSection";
  static components = { Section, ValidationMessages };
  static props = { messages: { type: Array, element: String } };
}
