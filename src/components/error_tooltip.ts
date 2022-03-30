import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../types";
import { css } from "./helpers/css";

css/* scss */ `
  .o-error-tooltip {
    font-size: 13px;
    background-color: white;
    border-left: 3px solid red;
    padding: 10px;
  }
`;

export interface ErrorToolTipProps {
  text: string;
}

export class ErrorToolTip extends Component<ErrorToolTipProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.ErrorToolTip";
}
