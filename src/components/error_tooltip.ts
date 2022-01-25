import { Component, xml } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../types";
import { css } from "./helpers/css";

const TEMPLATE = xml/* xml */ `
    <div class="o-error-tooltip"> 
      <t t-esc="props.text"/>
    </div>
`;

const CSS = css/* scss */ `
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
  static template = TEMPLATE;
  static style = CSS;
}
