import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../types/index";
import { css } from "../../helpers";

interface Props {
  messages: string[];
  msgType: "warning" | "error";
}

css/* scss */ `
  .o-sidepanel-error,
  .o-sidepanel-warning {
    margin-top: 10px;

    .o-icon {
      margin-right: 5px;
      height: 1.2em;
      width: 1.2em;
    }
  }
`;
export class SidePanelErrors extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SidePanelErrors";

  get divClasses() {
    if (this.props.msgType === "warning") {
      return "o-sidepanel-warning text-warning";
    }
    return "o-sidepanel-error text-danger";
  }
}

SidePanelErrors.props = {
  messages: Array,
  msgType: String,
};
