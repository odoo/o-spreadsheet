import { props } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";

import { Component } from "../../owl3_compatibility_layer";
import { types } from "../props_validation";

export class ValidationMessages extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ValidationMessages";

  protected props = props({
    messages: types.array(types.string()),
    msgType: types.or([types.literal("warning"), types.literal("error"), types.literal("info")]),
    "singleBox?": types.boolean(),
  });

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
