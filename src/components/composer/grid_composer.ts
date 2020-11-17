import * as owl from "@odoo/owl";
import { SpreadsheetEnv, Zone, Rect, Viewport } from "../../types/index";

import { Composer } from "./composer";
import { fontSizeMap } from "../../fonts";

const { Component } = owl;
const { xml, css } = owl.tags;

const TEMPLATE = xml/* xml */ `
  <div class="o-grid-composer" t-att-style="containerStyle">
    <Composer
      focus="props.focus"
      inputStyle="composerStyle"
      t-on-keydown="onKeydown"
      t-on-content-width-changed="onWidthChanged"
    />
  </div>
`;
const COMPOSER_BORDER_WIDTH = 3 * 0.4 * window.devicePixelRatio || 1;
const CSS = css/* scss */ `
  .o-grid-composer {
    box-sizing: border-box;
    position: absolute;
    border: ${COMPOSER_BORDER_WIDTH}px solid #3266ca;
    white-space: nowrap;
  }
`;

interface Props {
  viewport: Viewport;
  focus: boolean;
  content: string;
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
    this.zone = this.getters.expandZone(this.getters.getActiveSheetId(), {
      left: col,
      right: col,
      top: row,
      bottom: row,
    });
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
        height:${height + 1}px;
        font-size:${fontSizeMap[style.fontSize || 10]}px;
        ${weight}${italic}${strikethrough}`;
  }

  get composerStyle(): string {
    const style = this.getters.getCurrentStyle();
    const cell = this.getters.getActiveCell() || { type: "text" };
    const height = this.rect[3] - COMPOSER_BORDER_WIDTH * 2 + 1;
    const align = "align" in style ? style.align : cell.type === "number" ? "right" : "left";
    return `text-align:${align};
        height: ${height}px;
        line-height:${height}px;`;
  }

  mounted() {
    const el = this.el!;
    el.style.width = (Math.max(el.scrollWidth + 10, this.rect[2] + 1) + "px") as string;
    el.style.height = (this.rect[3] + 1 + "px") as string;
  }

  onWidthChanged(ev: CustomEvent) {
    const padding = this.props.focus ? 40 : 0;
    this.resize(ev.detail.newWidth + padding);
  }

  onKeydown(ev: KeyboardEvent) {
    // In selecting mode, arrows should not move the cursor but it should
    // select adjacent cells on the grid.
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(ev.key)) {
      ev.preventDefault();
    }
  }

  private resize(width: number) {
    const el = this.el! as HTMLInputElement;
    el.style.width = (Math.max(width + 10, this.rect[2] + 0.5) + "px") as string;
    el.style.height = (this.rect[3] + 0.5 + "px") as string;
  }
}
