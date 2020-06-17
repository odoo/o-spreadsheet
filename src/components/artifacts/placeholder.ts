import { Component, tags } from "@odoo/owl";
import { SpreadsheetEnv, Viewport } from "../../types/index";

const { xml, css } = tags;

const TEMPLATE = xml/* xml */ `
<div class="o-placeholder">

</div>

`;

// -----------------------------------------------------------------------------
// STYLE
// -----------------------------------------------------------------------------
const CSS = css/* scss */ `
  .o-placeholder {
    width: 100%;
    height: 100%;
    border: 1px solid black;
    position: relative;
    background-color: pink;
  }
`;

interface Props {
  viewport: Viewport;
  size: { x: number; y: number; width: number; height: number };
}

export class Placeholder extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;
}
