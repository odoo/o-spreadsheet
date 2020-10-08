import * as owl from "@odoo/owl";
import { SpreadsheetEnv, Zone, Rect, Viewport } from "../../types/index";

import { Composer } from "./composer";
import { fontSizeMap } from "../../fonts";

const { Component } = owl;
const { xml, css } = owl.tags;

const TEMPLATE = xml/* xml */ `
  <div class="o-grid-composer" t-att-style="containerStyle">
    <Composer
      inputStyle="composerStyle"
      t-on-input="onInput"/>
  </div>
`;
const CSS = css/* scss */ `
  .o-grid-composer {
    box-sizing: border-box;
    position: absolute;
    border: 1.6px solid #3266ca;
  }
`;

interface Props {
  viewport: Viewport;
}
/**
 * This component is a composer which positions itself on the grid at the anchor cell.
 * It also applies the style of the cell to the composer input.
 */
export class GridComposer extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;
  static components = { Composer };

  private getters = this.env.getters;
  private zone: Zone;
  private rect: Rect;

  constructor() {
    super(...arguments);
    const [col, row] = this.getters.getPosition();
    this.zone = this.getters.expandZone({ left: col, right: col, top: row, bottom: row });
    this.rect = this.getters.getRect(this.zone, this.props.viewport);
  }

  get containerStyle(): string {
    const style = this.getters.getCurrentStyle();
    const [x, y, , height] = this.rect;
    const weight = `font-weight:${style.bold ? "bold" : 500};`;
    const italic = style.italic ? `font-style: italic;` : ``;
    const strikethrough = style.strikethrough ? `text-decoration:line-through;` : ``;
    return `left: ${x - 1}px;
        top:${y}px;
        height:${height}px;
        font-size:${fontSizeMap[style.fontSize || 10]}px;
        ${weight}${italic}${strikethrough}`;
  }

  get composerStyle(): string {
    const style = this.getters.getCurrentStyle();
    const cell = this.getters.getActiveCell() || { type: "text" };
    const height = this.rect[3];
    const align = "align" in style ? style.align : cell.type === "number" ? "right" : "left";
    return `text-align:${align};
        line-height:${height - 1.5}px;`;
  }

  mounted() {
    const el = this.el!;
    el.style.width = (Math.max(el.scrollWidth + 10, this.rect[2] + 0.5) + "px") as string;
    el.style.height = (this.rect[3] + 0.5 + "px") as string;
  }

  onInput(ev: KeyboardEvent) {
    const el = this.el! as HTMLInputElement;
    const composerInput = ev.target! as HTMLInputElement;
    if (composerInput.clientWidth !== composerInput.scrollWidth) {
      el.style.width = (composerInput.scrollWidth + 50) as any;
    }
  }
}
