import { Component } from "@odoo/owl";
import { FOOTER_HEIGHT, SCROLLBAR_WIDTH } from "../../constants";
import { SpreadsheetChildEnv } from "../../types";
import { css } from "../helpers";

css/* scss */ `
  .o-progressBar-container {
    background-color: pink;
    height: 100px;
    width: 100px;
    position: absolute;
    right: ${SCROLLBAR_WIDTH}px;
    bottom: ${FOOTER_HEIGHT}px;
  }
`;

export class ProgressBarContainer extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ProgressBarContainer";
  static props = {};
}
