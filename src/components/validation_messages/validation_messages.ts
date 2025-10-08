import { Component } from "@odoo/owl";

import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheetChildEnv";

interface Props {
  messages: string[];
  msgType: "warning" | "error" | "info";
  singleBox?: boolean;
}

export class ValidationMessages extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ValidationMessages";
  static props = {
    messages: Array,
    msgType: String,
    singleBox: { type: Boolean, optional: true },
  };

  get divClasses() {
    if (this.props.msgType === "warning") {
      return "o-validation-warning";
    }
    if (this.props.msgType === "info") {
      return "o-validation-info";
    }
    return "o-validation-error";
  }

  get alertBoxes(): string[][] {
    return this.props.singleBox ? [this.props.messages] : this.props.messages.map((msg) => [msg]);
  }
}
