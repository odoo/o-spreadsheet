import { SpreadsheetEnv, Viewport, Figure } from "../../types/index";
import { Component } from "@odoo/owl";
import * as owl from "@odoo/owl";
import { figureRegistry } from "../../registries/index";
import { HEADER_HEIGHT, HEADER_WIDTH, SELECTION_BORDER_COLOR } from "../../constants";
import { startDnd } from "../helpers/drag_and_drop";

const { xml, css } = owl.tags;
const { useState } = owl;

interface FigureInfo {
  id: string;
  isSelected: boolean;
  figure: Figure;
}

const TEMPLATE = xml/* xml */ `
<div>
    <t t-foreach="getFigures()" t-as="info" t-key="info.id">
        <div
          class="o-figure-wrapper"
          t-att-style="getStyle(info)"
          t-on-mousedown="onMouseDown(info.figure)" >
            <div
              class="o-figure"
              t-att-class="{active: info.isSelected, 'o-dragging': info.id === dnd.figureId}"
              t-att-style="getDims(info)">
              <t t-component="figureRegistry.get(info.figure.tag).Component"
                t-key="info.id"
                figure="info.figure" />
              <t t-if="info.isSelected">
                  <div class="o-anchor o-topRight"></div>
                  <div class="o-anchor o-topLeft"></div>
                  <div class="o-anchor o-bottomRight"></div>
                  <div class="o-anchor o-bottomLeft"></div>
              </t>
            </div>
        </div>
    </t>
</div>
`;

// -----------------------------------------------------------------------------
// STYLE
// -----------------------------------------------------------------------------
const ANCHOR_SIZE = 8;
const BORDER_WIDTH = 1;
const ACTIVE_BORDER_WIDTH = 2;

const CSS = css/*SCSS*/ `
  .o-figure-wrapper {
    overflow: hidden;
  }

  .o-figure {
    border: 1px solid black;
    box-sizing: border-box;
    position: absolute;
    bottom: 3px;
    right: 3px;

    &.active {
      border: ${ACTIVE_BORDER_WIDTH}px solid ${SELECTION_BORDER_COLOR};
      z-index: 1;
    }

    &.o-dragging {
      opacity: 0.8;
      cursor: grabbing;
    }

    .o-anchor {
      z-index: 1000;
      position: absolute;
      outline: ${BORDER_WIDTH}px solid white;
      width: ${ANCHOR_SIZE}px;
      height: ${ANCHOR_SIZE}px;
      background-color: #1a73e8;
      &.o-topRight {
        top: -${ANCHOR_SIZE / 2}px;
        right: -${ANCHOR_SIZE / 2}px;
        cursor: ne-resize;
      }
      &.o-topLeft {
        top: -${ANCHOR_SIZE / 2}px;
        left: -${ANCHOR_SIZE / 2}px;
        cursor: nw-resize;
      }
      &.o-bottomRight {
        bottom: -${ANCHOR_SIZE / 2}px;
        right: -${ANCHOR_SIZE / 2}px;
        cursor: se-resize;
      }
      &.o-bottomLeft {
        bottom: -${ANCHOR_SIZE / 2}px;
        left: -${ANCHOR_SIZE / 2}px;
        cursor: sw-resize;
      }
    }
  }
`;

export class FiguresContainer extends Component<{ viewport: Viewport }, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;
  static components = {};
  figureRegistry = figureRegistry;

  dnd = useState({
    figureId: "",
    x: 0,
    y: 0,
  });

  getters = this.env.getters;
  dispatch = this.env.dispatch;

  getFigures(): FigureInfo[] {
    const selectedId = this.getters.getSelectedFigureId();
    return this.getters.getFigures(this.props.viewport).map((f) => ({
      id: f.id,
      isSelected: f.id === selectedId,
      figure: f,
    }));
  }

  getDims(info: FigureInfo) {
    const borders = 2 * (info.isSelected ? ACTIVE_BORDER_WIDTH : BORDER_WIDTH);
    const figure = info.figure;
    return `width:${figure.width + borders}px;height:${figure.height + borders}px`;
  }

  getStyle(info: FigureInfo) {
    const { figure, isSelected } = info;
    const { width, height } = figure;
    const { offsetX, offsetY } = this.props.viewport;
    const target = figure.id === this.dnd.figureId ? this.dnd : figure;
    let x = target.x - offsetX + HEADER_WIDTH - 1;
    let y = target.y - offsetY + HEADER_HEIGHT - 1;
    // width and height of wrapper need to be adjusted so we do not overlap
    // with headers
    const correctionX = Math.max(0, HEADER_WIDTH - x);
    x += correctionX;
    const correctionY = Math.max(0, HEADER_HEIGHT - y);
    y += correctionY;

    if (width < 0 || height < 0) {
      return `position:absolute;display:none;`;
    }
    const offset =
      ANCHOR_SIZE + ACTIVE_BORDER_WIDTH + (isSelected ? ACTIVE_BORDER_WIDTH : BORDER_WIDTH);
    return `position:absolute; top:${y + 1}px; left:${x + 1}px; width:${
      width - correctionX + offset
    }px; height:${height - correctionY + offset}px`;
  }

  mounted() {
    // horrible, but necessary
    // the following line ensures that we render the figures with the correct
    // viewport.  The reason is that whenever we initialize the grid
    // component, we do not know yet the actual size of the viewport, so the
    // first owl rendering is done with an empty viewport.  Only then we can
    // compute which figures should be displayed, so we have to force a
    // new rendering
    this.render();
  }

  onMouseDown(figure: Figure, ev: MouseEvent) {
    if (ev.button > 0) {
      // not main button, probably a context menu
      return;
    }
    this.dispatch("SELECT_FIGURE", { id: figure.id });
    const initialX = ev.clientX;
    const initialY = ev.clientY;
    this.dnd.figureId = figure.id;
    this.dnd.x = figure.x;
    this.dnd.y = figure.y;

    const onMouseMove = (ev: MouseEvent) => {
      this.dnd.x = figure.x - initialX + ev.clientX;
      this.dnd.y = figure.y - initialY + ev.clientY;
    };
    const onMouseUp = (ev: MouseEvent) => {
      this.dnd.figureId = "";
      this.dispatch("MOVE_FIGURE", { id: figure.id, x: this.dnd.x, y: this.dnd.y });
    };
    startDnd(onMouseMove, onMouseUp);
  }
}
