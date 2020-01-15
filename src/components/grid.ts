import * as owl from "@odoo/owl";

import { HEADER_WIDTH, HEADER_HEIGHT, GridModel } from "../grid_model";
import { Composer } from "./composer";
import { drawGrid } from "./grid_renderer";

/**
 * The Grid component is the main part of the spreadsheet UI. It is responsible
 * for displaying the actual grid, rendering it, managing events, ...
 *
 * The grid is rendered on a canvas. 3 sub components are (sometimes) displayed
 * on top of the canvas:
 * - a composer (to edit the cell content)
 * - a horizontal resizer (to resize columns)
 * - a vertical resizer (same, for rows)
 */

const { Component } = owl;
const { xml, css } = owl.tags;
const { useRef, useState } = owl.hooks;

// -----------------------------------------------------------------------------
// Resizer component
// -----------------------------------------------------------------------------
class Resizer extends Component<any, any> {
  static template = xml/* xml */ `
    <div class="o-resizer horizontal" t-on-mousemove="onMouseMove"  t-on-mouseleave="onMouseLeave" t-on-mousedown.self="selectCol">
      <t t-if="state.active">
        <div class="o-handle" t-att-class="{dragging:state.dragging}" t-on-mousedown="onMouseDown"
        t-attf-style="left:{{state.left}}px;"/>
      </t>
    </div>`;

  static style = css/* scss */ `
    .o-resizer {
      position: absolute;
      &.horizontal {
        top: 0;
        left: ${HEADER_WIDTH}px;
        right: 0;
        height: ${HEADER_HEIGHT}px;
      }

      .o-handle {
        position: absolute;
        height: ${HEADER_HEIGHT}px;
        width: 4px;
        cursor: ew-resize;
        background-color: #3266ca;
        &.dragging {
          margin-right: -2px;
          width: 1px;
          height: 10000px;
        }
      }
    }
  `;

  model: GridModel = this.props.model;
  state = useState({
    active: false,
    left: 0,
    dragging: false,
    activeCol: 0,
    delta: 0
  });
  onMouseMove(ev: MouseEvent) {
    if (this.state.dragging) {
      return;
    }
    const x = ev.clientX;
    const c = this.model.getCol(x);
    if (c < 0) {
      return;
    }
    const col = this.model.cols[c];
    const offsetX = this.model.offsetX;
    if (x - (col.left - offsetX) < 15 && c !== this.model.viewport.left) {
      this.state.active = true;
      this.state.left = col.left - offsetX - HEADER_WIDTH - 2;
      this.state.activeCol = c - 1;
    } else if (col.right - offsetX - x < 15) {
      this.state.active = true;
      this.state.left = col.right - offsetX - HEADER_WIDTH - 2;
      this.state.activeCol = c;
    } else {
      this.state.active = false;
    }
  }

  onMouseLeave() {
    this.state.active = this.state.dragging;
  }
  onMouseDown(ev: MouseEvent) {
    this.state.dragging = true;
    this.state.delta = 0;
    const initialX = ev.clientX;
    const left = this.state.left;
    const onMouseUp = ev => {
      this.state.dragging = false;
      this.state.active = false;
      window.removeEventListener("mousemove", onMouseMove);
      this.model.setColSize(this.state.activeCol, this.state.delta);
    };
    const onMouseMove = ev => {
      this.state.delta = ev.clientX - initialX;
      this.state.left = left + this.state.delta;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp, { once: true });
  }

  selectCol(ev: MouseEvent) {
    const col = this.model.getCol(ev.clientX);
    this.model.selectColumn(col);
  }
}

// -----------------------------------------------------------------------------
// TEMPLATE
// -----------------------------------------------------------------------------
const TEMPLATE = xml/* xml */ `
  <div class="o-spreadsheet-sheet" t-on-click="focus">
    <t t-if="model.isEditing">
      <Composer model="model" t-ref="composer" t-on-composer-unmounted="focus" />
    </t>
    <canvas t-ref="canvas"
      t-on-mousedown="onMouseDown"
      t-on-dblclick="onDoubleClick"
      t-on-keydown="onKeydown" tabindex="-1"
      t-on-mousewheel="onMouseWheel" />
    <Resizer model="model"/>
    <div class="o-scrollbar vertical" t-on-scroll="onScroll" t-ref="vscrollbar">
      <div t-attf-style="width:1px;height:{{model.height}}px"/>
    </div>
    <div class="o-scrollbar horizontal" t-on-scroll="onScroll" t-ref="hscrollbar">
      <div t-attf-style="height:1px;width:{{model.width}}px"/>
    </div>
  </div>`;

// -----------------------------------------------------------------------------
// STYLE
// -----------------------------------------------------------------------------
const CSS = css/* scss */ `
  .o-spreadsheet-sheet {
    position: relative;
    overflow: hidden;

    > canvas:focus {
      outline: none;
    }

    .o-scrollbar {
      position: absolute;
      overflow: auto;
      &.vertical {
        right: 0;
        top: ${HEADER_HEIGHT}px;
        bottom: 15px;
      }
      &.horizontal {
        bottom: 0;
        right: 15px;
        left: ${HEADER_WIDTH}px;
      }
    }
  }
`;

// -----------------------------------------------------------------------------
// JS

// -----------------------------------------------------------------------------
export class Grid extends Component<any, any> {
  static template = TEMPLATE;
  static style = CSS;
  static components = { Composer, Resizer };

  composer = useRef("composer");

  vScrollbar = useRef("vscrollbar");
  hScrollbar = useRef("hscrollbar");
  canvas = useRef("canvas");
  context: CanvasRenderingContext2D | null = null;
  hasFocus = false;
  model: GridModel = this.props.model;
  clickedCol = 0;
  clickedRow = 0;

  mounted() {
    const canvas = this.canvas.el as any;
    this.focus();
    const ctx = canvas.getContext("2d");
    // Scale all drawing operations by the dpr, so you
    // don't have to worry about the difference.
    // ctx.scale(this.dpr, this.dpr);
    this.context = ctx;
    this.updateVisibleZone();
    this.drawGrid();
  }

  willPatch() {
    this.hasFocus = this.el!.contains(document.activeElement);
  }
  patched() {
    this.updateVisibleZone();
    this.drawGrid();
  }

  focus() {
    if (!this.model.isSelectingRange) {
      this.canvas.el!.focus();
    }
  }

  onScroll() {
    const model = this.model;
    const { offsetX, offsetY } = model;
    this.updateVisibleZone();
    if (offsetX !== model.offsetX || offsetY !== model.offsetY) {
      this.render();
    }
  }

  updateVisibleZone() {
    const width = this.el!.clientWidth;
    const height = this.el!.clientHeight;
    const scrollTop = this.vScrollbar.el!.scrollTop;
    const scrollLeft = this.hScrollbar.el!.scrollLeft;
    this.model.updateVisibleZone(width, height, scrollLeft, scrollTop);
  }
  drawGrid() {
    // whenever the dimensions are changed, we need to reset the width/height
    // of the canvas manually, and reset its scaling.
    const dpr = window.devicePixelRatio || 1;
    const width = this.el!.clientWidth;
    const height = this.el!.clientHeight;
    const canvas = this.canvas.el as any;
    const context = canvas.getContext("2d");
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.setAttribute("style", `width:${width}px;height:${height}px;`);
    this.context = context;
    context.translate(0.5, 0.5);
    context.scale(dpr, dpr);
    drawGrid(context, this.model, width, height);
  }

  onMouseWheel(ev) {
    const vScrollbar = this.vScrollbar.el!;
    vScrollbar.scrollTop = vScrollbar.scrollTop + ev.deltaY;
    const hScrollbar = this.hScrollbar.el!;
    hScrollbar.scrollLeft = hScrollbar.scrollLeft + ev.deltaX;
  }

  // ---------------------------------------------------------------------------
  // Zone selection with mouse
  // ---------------------------------------------------------------------------

  onMouseDown(ev: MouseEvent) {
    const col = this.model.getCol(ev.offsetX);
    const row = this.model.getRow(ev.offsetY);
    this.clickedCol = col;
    this.clickedRow = row;
    if (col < 0 && row < 0) {
      return;
    }

    if (ev.shiftKey) {
      this.model.updateSelection(col, row);
    } else {
      this.model.selectCell(col, row, ev.ctrlKey);
    }
    let prevCol = col;
    let prevRow = row;
    const onMouseMove = ev => {
      const col = this.model.getCol(ev.offsetX);
      const row = this.model.getRow(ev.offsetY);
      if (col < 0 || row < 0) {
        return;
      }
      if (col !== prevCol || row !== prevRow) {
        prevCol = col;
        prevRow = row;
        this.model.updateSelection(col, row);
      }
    };
    const onMouseUp = ev => {
      if (this.model.isSelectingRange) {
        if (this.composer.comp) {
          (this.composer.comp as Composer).addTextFromSelection();
        }
      }
      this.canvas.el!.removeEventListener("mousemove", onMouseMove);
    };

    this.canvas.el!.addEventListener("mousemove", onMouseMove);
    document.body.addEventListener("mouseup", onMouseUp, { once: true });
  }

  onDoubleClick(ev) {
    const col = this.model.getCol(ev.offsetX);
    const row = this.model.getRow(ev.offsetY);
    if (this.clickedCol === col && this.clickedRow === row) {
      this.model.startEditing();
    }
  }

  // ---------------------------------------------------------------------------
  // Keyboard interactions
  // ---------------------------------------------------------------------------

  onKeydown(ev: KeyboardEvent) {
    const deltaMap = {
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1]
    };
    const delta = deltaMap[ev.key];
    if (delta) {
      if (ev.shiftKey) {
        this.model.moveSelection(delta[0], delta[1]);
      } else {
        this.model.movePosition(delta[0], delta[1]);
      }
      return;
    }
    if (this.model.isSelectingRange) {
      switch (ev.key) {
        case "Enter":
          if (this.composer.comp) {
            (this.composer.comp as Composer).addTextFromSelection();
            this.model.isSelectingRange = false;
          }
          return;

        case "Escape":
          this.model.isSelectingRange = false;
          ev.stopPropagation();
          return;
      }
    }

    if (ev.key === "Tab") {
      ev.preventDefault();
      const deltaX = ev.shiftKey ? -1 : 1;
      this.model.movePosition(deltaX, 0);
      return;
    }
    if (ev.key === "F2" || ev.key === "Enter") {
      this.model.startEditing();
      return;
    }
    if (ev.key === "Delete") {
      this.model.deleteSelection();
    }
    if (ev.ctrlKey) {
      switch (ev.key) {
        case "x":
          this.model.copySelection(true);
          break;
        case "c":
          this.model.copySelection();
          break;
        case "v":
          this.model.pasteSelection();
          break;
      }
      return;
    }

    if (ev.key.length === 1) {
      this.model.startEditing(ev.key);
    }
  }
}
