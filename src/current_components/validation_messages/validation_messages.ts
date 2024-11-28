import { Component } from "@odoo/owl";
import {
  ALERT_DANGER_BG,
  ALERT_DANGER_BORDER,
  ALERT_DANGER_TEXT_COLOR,
  ALERT_INFO_BG,
  ALERT_INFO_BORDER,
  ALERT_INFO_TEXT_COLOR,
  ALERT_WARNING_BG,
  ALERT_WARNING_BORDER,
  ALERT_WARNING_TEXT_COLOR,
} from "../../constants";
import { SpreadsheetChildEnv } from "../../types/index";
import { css } from "../helpers";

interface Props {
  messages: string[];
  msgType: "warning" | "error" | "info";
  singleBox?: boolean;
}

css/* scss */ `
  .o-validation {
    border-radius: 4px;
    border-width: 0 0 0 3px;
    border-style: solid;
    gap: 3px;

    .o-icon {
      margin-right: 5px;
      height: 1.2em;
      width: 1.2em;
    }
  }

  .o-validation-warning {
    border-color: ${ALERT_WARNING_BORDER};
    color: ${ALERT_WARNING_TEXT_COLOR};
    background-color: ${ALERT_WARNING_BG};
  }

  .o-validation-error {
    border-color: ${ALERT_DANGER_BORDER};
    color: ${ALERT_DANGER_TEXT_COLOR};
    background-color: ${ALERT_DANGER_BG};
  }

  .o-validation-info {
    border-color: ${ALERT_INFO_BORDER};
    color: ${ALERT_INFO_TEXT_COLOR};
    background-color: ${ALERT_INFO_BG};
  }
`;
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
