import * as owl from "@odoo/owl";

import { GridModel } from "../model/index";
import { Composer } from "./composer";
import { drawGrid } from "./grid_renderer";
import { HEADER_WIDTH, HEADER_HEIGHT } from "../constants";
import { Resizer } from "./resizer";

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
const { useRef, useExternalListener } = owl.hooks;

// -----------------------------------------------------------------------------
// TEMPLATE
// -----------------------------------------------------------------------------
const TEMPLATE = xml/* xml */ `
  <div class="o-spreadsheet-sheet" t-on-click="focus">
    <t t-if="model.state.isEditing">
      <Composer model="model" t-ref="composer" t-on-composer-unmounted="focus" />
    </t>
    <canvas t-ref="canvas"
      t-on-mousedown="onMouseDown"
      t-on-dblclick="onDoubleClick"
      t-on-keydown="onKeydown" tabindex="-1"
      t-on-mousewheel="onMouseWheel" />
    <Resizer model="model"/>
    <div class="o-scrollbar vertical" t-on-scroll="onScroll" t-ref="vscrollbar">
      <div t-attf-style="width:1px;height:{{model.state.height}}px"/>
    </div>
    <div class="o-scrollbar horizontal" t-on-scroll="onScroll" t-ref="hscrollbar">
      <div t-attf-style="height:1px;width:{{model.state.width}}px"/>
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
  // last string that was cut or copied. It is necessary so we can make the
  // difference between a paste coming from the sheet itself, or from the
  // os clipboard
  clipBoardString: string = "";

  constructor() {
    super(...arguments);
    useExternalListener(document.body, "cut", this.copy.bind(this, true));
    useExternalListener(document.body, "copy", this.copy.bind(this, false));
    useExternalListener(document.body, "paste", this.paste);
  }

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
    if (!this.model.state.isSelectingRange) {
      this.canvas.el!.focus();
    }
  }

  onScroll() {
    const model = this.model;
    const { offsetX, offsetY } = model.state;
    this.updateVisibleZone();
    if (offsetX !== model.state.offsetX || offsetY !== model.state.offsetY) {
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
      if (this.model.state.isSelectingRange) {
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
    if (this.model.state.isSelectingRange) {
      switch (ev.key) {
        case "Enter":
          if (this.composer.comp) {
            (this.composer.comp as Composer).addTextFromSelection();
            this.model.state.isSelectingRange = false;
          }
          return;

        case "Escape":
          this.model.state.isSelectingRange = false;
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
      return;
    }

    if (ev.key.length === 1) {
      this.model.startEditing(ev.key);
    }
  }
  copy(cut: boolean, ev: ClipboardEvent) {
    if (document.activeElement !== this.canvas.el) {
      return;
    }
    if (cut) {
      this.model.cut();
    } else {
      this.model.copy();
    }
    const content = this.model.getClipboardContent();
    this.clipBoardString = content;
    ev.clipboardData!.setData("text/plain", content);
    ev.preventDefault();
  }
  paste(ev: ClipboardEvent) {
    if (document.activeElement !== this.canvas.el) {
      return;
    }
    const clipboardData = ev.clipboardData!;
    if (clipboardData.types.indexOf("text/plain") > -1) {
      const content = clipboardData.getData("text/plain");
      if (this.clipBoardString === content) {
        // the paste actually comes from o-spreadsheet itself
        const didPaste = this.model.paste();
        if (!didPaste) {
          this.trigger("notify-user", {
            content: "This operation is not allowed with multiple selections."
          });
        }
      } else {
        this.model.paste(content);
      }
    }
  }
}
