import * as owl from "@odoo/owl";
import { SELECTION_BORDER_COLOR } from "../../constants";
import { fontSizeMap } from "../../fonts";
import { Rect, SpreadsheetEnv } from "../../types/index";
import { getTextDecoration } from "../helpers/dom_helpers";
import { Composer } from "./composer";

const { Component } = owl;
const { useState } = owl.hooks;
const { xml, css } = owl.tags;

const SCROLLBAR_WIDTH = 14;
const SCROLLBAR_HIGHT = 15;

const TEMPLATE = xml/* xml */ `
  <div class="o-grid-composer" t-att-style="containerStyle">
    <Composer
      focus = "props.focus"
      inputStyle = "composerStyle"
      rect = "composerState.rect"
      delimitation = "composerState.delimitation"
      t-on-keydown = "onKeydown"
    />
  </div>
`;
const COMPOSER_BORDER_WIDTH = 3 * 0.4 * window.devicePixelRatio || 1;
const CSS = css/* scss */ `
  .o-grid-composer {
    z-index: 5;
    box-sizing: border-box;
    position: absolute;
    border: ${COMPOSER_BORDER_WIDTH}px solid ${SELECTION_BORDER_COLOR};
  }
`;

export interface Dimension {
  width: number;
  height: number;
}

interface ComposerState {
  rect: Rect | null;
  delimitation: Dimension | null;
}

interface Props {
  focus: "inactive" | "cellFocus" | "contentFocus";
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

  private composerState: ComposerState = useState({
    rect: null,
    delimitation: null,
  });

  get containerStyle(): string {
    const isFormula = this.getters.getCurrentContent().startsWith("=");
    const style = this.getters.getCurrentStyle();
    const [col, row] = this.getters.getPosition();

    // position style
    const [left, top, width, height] = this.rectComposer(col, col, row);

    // color style
    const background = (!isFormula && style.fillColor) || "#ffffff";
    const color = (!isFormula && style.textColor) || "#000000";

    // font style
    const fontSize = (!isFormula && style.fontSize) || 10;
    const fontWeight = !isFormula && style.bold ? "bold" : 500;
    const fontStyle = !isFormula && style.italic ? "italic" : "normal";
    const textDecoration = !isFormula ? getTextDecoration(style) : "none";

    // align style
    let textAlign = "left";

    if (!isFormula) {
      const cell = this.getters.getActiveCell();
      textAlign = style.align || cell?.defaultAlign || "left";
    }

    return `
      left: ${left - 1}px;
      top: ${top}px;
      min-width: ${width + 2}px;
      min-height: ${height + 1}px;

      background: ${background};
      color: ${color};

      font-size: ${fontSizeMap[fontSize]}px;
      font-weight: ${fontWeight};
      font-style: ${fontStyle};
      text-decoration: ${textDecoration};

      text-align: ${textAlign};
    `;
  }

  get composerStyle(): string {
    if (!this.el) {
      return ``;
    }
    const [col, row] = this.getters.getPosition();
    let maxCol = col;
    const [left, top, width, height] = this.rectComposer(col, maxCol, row);
    let composerMinWidth = width;
    const { width: viewportWidth, height: viewportHeight } = this.getters.getViewportDimension();
    const maxWidth = viewportWidth;
    while (this.el.clientWidth > composerMinWidth && left + composerMinWidth < maxWidth) {
      maxCol++;
      const [, , width] = this.rectComposer(col, maxCol, row);
      if (width + left > maxWidth) {
        composerMinWidth = maxWidth - left;
      } else {
        composerMinWidth = width;
      }
    }
    composerMinWidth = composerMinWidth - 2 * COMPOSER_BORDER_WIDTH - 4;
    const maxHeight =
      this.props.focus === "inactive"
        ? height - 2 * COMPOSER_BORDER_WIDTH
        : viewportHeight - 2 * COMPOSER_BORDER_WIDTH - top;
    return `
    max-height: ${maxHeight}px;
    min-width: ${composerMinWidth}px;
    max-width: ${maxWidth - left - 2 * COMPOSER_BORDER_WIDTH - 4}px;
    overflow: hidden;
  `;
  }

  private rectComposer(startCol: number, endCol: number, row: number): Rect {
    const zone = this.getters.expandZone(this.getters.getActiveSheetId(), {
      left: startCol,
      right: endCol,
      top: row,
      bottom: row,
    });
    return this.getters.getRect(zone, this.getters.getActiveSnappedViewport());
  }

  mounted() {
    const el = this.el!;

    const maxHeight = el.parentElement!.clientHeight - this.rectComposer[1] - SCROLLBAR_HIGHT;
    el.style.maxHeight = (maxHeight + "px") as string;

    const maxWidth = el.parentElement!.clientWidth - this.rectComposer[0] - SCROLLBAR_WIDTH;
    el.style.maxWidth = (maxWidth + "px") as string;

    this.composerState.rect = [
      this.rectComposer[0],
      this.rectComposer[1],
      el!.clientWidth,
      el!.clientHeight,
    ];
    this.composerState.delimitation = {
      width: el!.parentElement!.clientWidth,
      height: el!.parentElement!.clientHeight,
    };
  }

  onKeydown(ev: KeyboardEvent) {
    // In selecting mode, arrows should not move the cursor but it should
    // select adjacent cells on the grid.
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(ev.key)) {
      ev.preventDefault();
    }
  }
}
