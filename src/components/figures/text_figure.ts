import { Component, tags } from "@odoo/owl";
import { SpreadsheetEnv, Figure } from "../../types/index";

const { xml, css } = tags;

const TEMPLATE = xml/* xml */ `
  <div class="o-fig-text">
    <p t-esc="props.figure.data"/>
  </div>
`;

// -----------------------------------------------------------------------------
// STYLE
// -----------------------------------------------------------------------------
const CSS = css/* scss */ `
  .o-fig-text {
    width: 100%;
    height: 100%;
    margin: 0px;
    background-color: #eee;
    position: absolute;

    > p {
      margin: 5px;
    }
  }
`;

interface Props {
  figure: Figure<string>;
}

export class TextFigure extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;
}
