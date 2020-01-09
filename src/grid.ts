import * as owl from "@odoo/owl";

import { HEADER_WIDTH, HEADER_HEIGHT, GridModel } from "./grid_model.js";
import { Composer } from "./composer.js";
import { drawGrid } from "./grid_renderer";

const { Component } = owl;
const { xml, css } = owl.tags;
const { useRef } = owl.hooks;

const TEMPLATE = xml/* xml */ `
  <div class="o-spreadsheet-sheet">
    <t t-if="model.isEditing">
      <Composer model="model" />
    </t>
    <canvas t-ref="canvas"
      t-on-mousedown="onMouseDown"
      t-on-dblclick="onDoubleClick"
      t-on-keydown="onKeydown" tabindex="-1"
      t-on-mousewheel="onMouseWheel" />
    <div class="o-scrollbar vertical" t-on-scroll="onScroll" t-ref="vscrollbar">
      <div t-attf-style="width:1px;height:{{model.height}}px"/>
    </div>
    <div class="o-scrollbar horizontal" t-on-scroll="onScroll" t-ref="hscrollbar">
      <div t-attf-style="height:1px;width:{{model.width}}px"/>
    </div>
  </div>`;

const CSS = css/* scss */ `
  .o-spreadsheet-sheet {
    position: relative;
    overflow: hidden;

    .o-scrollbar {
      position: absolute;
      overflow: auto;
    }
    .o-scrollbar.vertical {
      right: 0;
      top: ${HEADER_HEIGHT}px;
      bottom: 15px;
    }
    .o-scrollbar.horizontal {
      bottom: 0;
      right: 15px;
      left: ${HEADER_WIDTH}px;
    }
  }
`;

export class Grid extends Component<any, any> {
  static template = TEMPLATE;
  static style = CSS;
  static components = { Composer };

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
    if (this.hasFocus && !this.el!.contains(document.activeElement)) {
      this.canvas.el!.focus();
    }
  }

  focus() {
    this.canvas.el!.focus();
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

  getColRowFromXY(x, y) {
    if (x <= HEADER_WIDTH || y <= HEADER_HEIGHT) {
      return [];
    }
    let col, row;
    const model = this.model;
    const { cols, rows, offsetX, offsetY } = model;
    for (let i = 0; i < cols.length; i++) {
      let c = cols[i];
      if (c.left - offsetX <= x && x <= c.right - offsetX) {
        col = i;
        break;
      }
    }
    for (let i = 0; i < rows.length; i++) {
      let r = rows[i];
      if (r.top - offsetY <= y && y <= r.bottom - offsetY) {
        row = i;
        break;
      }
    }
    return [col, row];
  }
  onMouseDown(ev) {
    // 32 for toolbar height. could not find a better way to get actual y offset
    const [col, row] = this.getColRowFromXY(ev.clientX, ev.clientY - 32);
    this.clickedCol = col;
    this.clickedRow = row;
    if (col !== undefined && row !== undefined) {
      this.model.selectCell(col, row);
      let prevCol = col;
      let prevRow = row;
      const onMouseMove = ev => {
        const [col, row] = this.getColRowFromXY(ev.clientX, ev.clientY - 32);
        if (col === undefined || row === undefined) {
          return;
        }
        if (col !== prevCol || row !== prevRow) {
          prevCol = col;
          prevRow = row;
          this.model.updateSelection(col, row);
        }
      };
      const onMouseUp = () => {
        this.canvas.el!.removeEventListener("mousemove", onMouseMove);
        this.canvas.el!.removeEventListener("mouseup", onMouseUp);
      };
      this.canvas.el!.addEventListener("mousemove", onMouseMove);
      this.canvas.el!.addEventListener("mouseup", onMouseUp);
    }
  }

  onDoubleClick(ev) {
    const [col, row] = this.getColRowFromXY(ev.clientX, ev.clientY - 32);
    if (this.clickedCol === col && this.clickedRow === row) {
      this.model.startEditing();
    }
  }

  onKeydown(ev) {
    const deltaMap = {
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1]
    };
    const delta = deltaMap[ev.key];
    if (delta) {
      this.model.moveSelection(delta[0], delta[1], ev.shiftKey);
      return;
    }
    if (ev.key === "Tab") {
      ev.preventDefault();
      const deltaX = ev.shiftKey ? -1 : 1;
      this.model.moveSelection(deltaX, 0);
      return;
    }
    if (ev.key === "Enter") {
      this.model.startEditing();
      return;
    }
    if (ev.key === "Delete") {
      this.model.deleteSelection();
    }
    if (ev.key === "c" && ev.ctrlKey) {
      this.model.copySelection();
      return;
    }
    if (ev.key === "v" && ev.ctrlKey) {
      this.model.pasteSelection();
      return;
    }

    if (ev.key.length === 1) {
      this.model.startEditing(ev.key);
    }
  }
}
