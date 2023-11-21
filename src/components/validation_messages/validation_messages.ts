import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../types/index";
import { css } from "../helpers";

interface Props {
  messages: string[];
  msgType: "warning" | "error";
}

css/* scss */ `
  .o-validation-error,
  .o-validation-warning {
    margin-top: 10px;

    .o-icon {
      margin-right: 5px;
      height: 1.2em;
      width: 1.2em;
    }
  }
`;
export class ValidationMessages extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ValidationMessages";
  static props = {
    messages: Array,
    msgType: String,
  };

  get divClasses() {
    if (this.props.msgType === "warning") {
      return "o-validation-warning text-warning";
    }
    return "o-validation-error text-danger";
  }
}
