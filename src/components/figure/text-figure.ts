import { Component, tags } from "@odoo/owl";
import { SpreadsheetEnv, Figure } from "../../types/index";

const { xml, css } = tags;

const TEMPLATE = xml/* xml */ `
<div class="o-fig-text" t-esc="props.figure.text">

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
    position: relative;
    background-color: pink;
  }
`;

interface Props {
  figure: Figure;
}

export class TextFigure extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;
}
