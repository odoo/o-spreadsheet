import * as owl from "@odoo/owl";
import {
  BACKGROUND_GRAY_COLOR,
  HEADER_WIDTH,
  SCROLLBAR_WIDTH,
  DEFAULT_CELL_HEIGHT
} from "../constants";
import { GridModel, GridState } from "../model/index";
import { Composer } from "./composer";
import { Overlay } from "./overlay";
import { ContextMenu } from "./context_menu";
import { isInside } from "../helpers";
import { drawGrid, getMaxSize } from "./grid_renderer";

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

const { Component, useState } = owl;
const { xml, css } = owl.tags;
const { useRef, useExternalListener } = owl.hooks;

// -----------------------------------------------------------------------------
// TEMPLATE
// -----------------------------------------------------------------------------
const TEMPLATE = xml/* xml */ `
  <div class="o-spreadsheet-sheet" t-on-click="focus">
    <t t-if="state.isEditing">
      <Composer model="model" t-ref="composer" t-on-composer-unmounted="focus" />
    </t>
    <canvas t-ref="canvas"
      t-on-mousedown="onMouseDown"
      t-on-dblclick="onDoubleClick"
      t-on-keydown="onKeydown" tabindex="-1"
      t-on-contextmenu="toggleContextMenu"
      t-on-wheel="onMouseWheel" />
    <Overlay model="model" t-on-autoresize="onAutoresize"/>
    <ContextMenu t-if="contextMenu.isOpen"
      model="model"
      position="contextMenu.position"
      t-on-close.stop="contextMenu.isOpen=false"/>
    <div class="o-scrollbar vertical" t-on-scroll="onScroll" t-ref="vscrollbar">
      <div t-attf-style="width:1px;height:{{state.height}}px"/>
    </div>
    <div class="o-scrollbar horizontal" t-on-scroll="onScroll" t-ref="hscrollbar">
      <div t-attf-style="height:1px;width:{{state.width}}px"/>
    </div>
  </div>`;

// -----------------------------------------------------------------------------
// STYLE
// -----------------------------------------------------------------------------
const CSS = css/* scss */ `
  .o-spreadsheet-sheet {
    position: relative;
    overflow: hidden;
    background-color: ${BACKGROUND_GRAY_COLOR};

    > canvas {
      border-top: 1px solid #aaa;
      border-bottom: 1px solid #aaa;

      &:focus {
        outline: none;
      }
    }

    .o-scrollbar {
      position: absolute;
      overflow: auto;
      &.vertical {
        right: 0;
        top: ${SCROLLBAR_WIDTH + 1}px;
        bottom: 15px;
        width: 15px;
      }
      &.horizontal {
        bottom: 0;
        height: 15px;
        right: ${SCROLLBAR_WIDTH + 1}px;
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
  static components = { Composer, Overlay, ContextMenu };

  contextMenu = useState({ isOpen: false, position: null } as {
    isOpen: boolean;
    position: null | { x: number; y: number };
  });

  composer = useRef("composer");

  vScrollbar = useRef("vscrollbar");
  hScrollbar = useRef("hscrollbar");
  canvas = useRef("canvas");
  context: CanvasRenderingContext2D | null = null;
  hasFocus = false;
  model: GridModel = this.props.model;
  state: GridState = this.model.state;
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
    this.focus();
    this.updateVisibleZone();
    this.drawGrid();
  }

  willPatch() {
    this.hasFocus = this.el!.contains(document.activeElement);
  }
  patched() {
    this.updateVisibleZone();
    this.vScrollbar.el!.scrollTop = this.state.scrollTop;
    this.hScrollbar.el!.scrollLeft = this.state.scrollLeft;
    this.drawGrid();
  }

  focus() {
    if (!this.state.isSelectingRange) {
      this.canvas.el!.focus();
    }
  }

  onScroll() {
    const scrollTop = this.vScrollbar.el!.scrollTop;
    const scrollLeft = this.hScrollbar.el!.scrollLeft;
    if (this.model.updateScroll(scrollTop, scrollLeft)) {
      this.render();
    }
  }

  updateVisibleZone() {
    const width = this.el!.clientWidth - SCROLLBAR_WIDTH;
    const height = this.el!.clientHeight - SCROLLBAR_WIDTH;
    this.model.updateVisibleZone(width, height);
  }
  drawGrid() {
    // whenever the dimensions are changed, we need to reset the width/height
    // of the canvas manually, and reset its scaling.
    const dpr = window.devicePixelRatio || 1;
    const width = this.el!.clientWidth - SCROLLBAR_WIDTH;
    const height = this.el!.clientHeight - SCROLLBAR_WIDTH;
    const canvas = this.canvas.el as any;
    const context = canvas.getContext("2d", { alpha: false });
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.setAttribute("style", `width:${width}px;height:${height}px;`);
    this.context = context;
    context.translate(-0.5, -0.5);
    context.scale(dpr, dpr);
    drawGrid(context, this.model, width, height);
  }

  onMouseWheel(ev: WheelEvent) {
    function normalize(val: number): number {
      return val * (ev.deltaMode === 0 ? 1 : DEFAULT_CELL_HEIGHT);
    }
    const vScrollbar = this.vScrollbar.el!;
    vScrollbar.scrollTop = vScrollbar.scrollTop + normalize(ev.deltaY);
    const hScrollbar = this.hScrollbar.el!;
    hScrollbar.scrollLeft = hScrollbar.scrollLeft + normalize(ev.deltaX);
  }

  onAutoresize(ev: CustomEvent) {
    const index = ev.detail.index;
    const col = ev.detail.type === "col";
    const activeElements = col ? this.model.getActiveCols() : this.model.getActiveRows();
    if (activeElements.has(index)) {
      this._resizeElements(col, activeElements);
    } else {
      this._resizeElement(col, index);
    }
  }

  _resizeElements(col, activeElts) {
    for (let elt of activeElts) {
      const size = getMaxSize(this.context!, this.model, col, elt);
      if (size !== 0) {
        col ? this.model.setColSize(elt, size) : this.model.setRowSize(elt, size);
      }
    }
  }

  _resizeElement(col, index) {
    const size = getMaxSize(this.context!, this.model, col, index);
    if (size !== 0) {
      col ? this.model.setColSize(index, size) : this.model.setRowSize(index, size);
    }
  }

  // ---------------------------------------------------------------------------
  // Zone selection with mouse
  // ---------------------------------------------------------------------------

  onMouseDown(ev: MouseEvent) {
    if (ev.button > 0) {
      // not main button, probably a context menu
      return;
    }
    const col = this.model.getCol(ev.offsetX);
    const row = this.model.getRow(ev.offsetY);
    if (col < 0 || row < 0) {
      return;
    }
    this.clickedCol = col;
    this.clickedRow = row;

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
      if (this.model.state.isCopyingFormat) {
        this.model.paste({ onlyFormat: true });
      }
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
      if (this.model.state.isCopyingFormat) {
        this.model.paste({ onlyFormat: true });
      }
      return;
    }
    if (this.state.isSelectingRange) {
      switch (ev.key) {
        case "Enter":
          if (this.composer.comp) {
            (this.composer.comp as Composer).addTextFromSelection();
            this.state.isSelectingRange = false;
          }
          return;

        case "Escape":
          this.state.isSelectingRange = false;
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
      if (ev.key.toLowerCase() === "z") {
        this.model.undo();
      }
      if (ev.key.toLowerCase() === "y") {
        this.model.redo();
      }
      if (ev.key.toLowerCase() === "a") {
        ev.preventDefault();
        this.model.selectAll();
      }
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
        this.model.paste({ clipboardContent: content });
      }
    }
  }
  toggleContextMenu(ev) {
    const col = this.model.getCol(ev.offsetX);
    const row = this.model.getRow(ev.offsetY);
    if (col < 0 || row < 0) {
      return;
    }
    const zones = this.model.state.selection.zones;
    const lastZone = zones[zones.length - 1];
    if (!isInside(col, row, lastZone)) {
      this.model.selectCell(col, row);
    }
    ev.preventDefault();
    this.contextMenu.isOpen = true;
    this.contextMenu.position = { x: ev.offsetX, y: ev.offsetY };
  }
}
