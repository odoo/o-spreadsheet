import * as owl from "@odoo/owl";
import {
  BACKGROUND_GRAY_COLOR,
  DEFAULT_CELL_HEIGHT,
  HEADER_WIDTH,
  SCROLLBAR_WIDTH
} from "../constants";
import { isInside } from "../helpers/index";
import { GridModel } from "../model/index";
import { UI } from "../types/index";
import { Composer } from "./composer";
import { ContextMenu } from "./context_menu";
import { drawGrid } from "./grid_renderer";
import { Overlay } from "./overlay";
import { ContextMenuItem, contextMenuRegistry } from "./registries";

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
  <div class="o-spreadsheet-sheet" t-on-click="focus" t-on-keydown="onKeydown">
    <t t-if="state.isEditing">
      <Composer model="model" t-ref="composer" t-on-composer-unmounted="focus" />
    </t>
    <canvas t-ref="canvas"
      t-on-mousedown="onMouseDown"
      t-on-dblclick="onDoubleClick"
      tabindex="-1"
      t-on-contextmenu="toggleContextMenu"
      t-on-wheel="onMouseWheel" />
    <Overlay model="model"/>
    <ContextMenu t-if="contextMenu.isOpen"
      model="model"
      position="contextMenu.position"
      menuItems="contextMenu.items"
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

// copy and paste are specific events that should not be managed by the keydown event,
// but they shouldn't be preventDefault and stopped (else copy and paste events will not trigger)
// and also should not result in typing the character C or V in the composer
const keyDownMappingIgnore: string[] = ["CTRL+C", "CTRL+V"];

// -----------------------------------------------------------------------------
// JS

// -----------------------------------------------------------------------------
export class Grid extends Component<any, any> {
  static template = TEMPLATE;
  static style = CSS;
  static components = { Composer, Overlay, ContextMenu };

  contextMenu = useState({ isOpen: false, position: null, items: [] } as {
    isOpen: boolean;
    position: null | { x: number; y: number };
    items: ContextMenuItem[];
  });

  composer = useRef("composer");

  vScrollbar = useRef("vscrollbar");
  hScrollbar = useRef("hscrollbar");
  canvas = useRef("canvas");
  context: CanvasRenderingContext2D | null = null;
  hasFocus = false;
  model: GridModel = this.props.model;
  state: UI = this.model.state;
  clickedCol = 0;
  clickedRow = 0;
  // last string that was cut or copied. It is necessary so we can make the
  // difference between a paste coming from the sheet itself, or from the
  // os clipboard
  clipBoardString: string = "";

  // this map will handle most of the actions that should happen on key down. The arrow keys are managed in the key
  // down itself
  keyDownMapping: { [key: string]: Function } = {
    ENTER: () => this.model.dispatch({ type: "START_EDITION" }),
    TAB: () => this.model.dispatch({ type: "MOVE_POSITION", deltaX: 1, deltaY: 0 }),
    "SHIFT+TAB": () => this.model.dispatch({ type: "MOVE_POSITION", deltaX: -1, deltaY: 0 }),
    F2: () => this.model.dispatch({ type: "START_EDITION" }),
    DELETE: () => {
      this.model.dispatch({
        type: "DELETE_CONTENT",
        sheet: this.state.activeSheet,
        target: this.state.selection.zones
      });
    },
    "CTRL+A": () => this.model.dispatch({ type: "SELECT_ALL" }),
    "CTRL+S": () => {
      this.trigger("save-content", {
        data: this.model.exportData()
      });
    },
    "CTRL+Z": () => this.model.undo(),
    "CTRL+Y": () => this.model.redo()
  };

  private processCopyFormat() {
    if (this.model.getters.isPaintingFormat()) {
      this.model.dispatch({
        type: "PASTE",
        target: this.model.state.selection.zones
      });
    }
  }

  constructor() {
    super(...arguments);
    useExternalListener(document.body, "cut", this.copy.bind(this, true));
    useExternalListener(document.body, "copy", this.copy.bind(this, false));
    useExternalListener(document.body, "paste", this.paste);
  }

  mounted() {
    this.focus();
    this.drawGrid();
  }

  willPatch() {
    this.hasFocus = this.el!.contains(document.activeElement);
  }
  async willUpdateProps() {
    this.state = this.model.state;
  }
  patched() {
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

  drawGrid() {
    const width = this.el!.clientWidth - SCROLLBAR_WIDTH;
    const height = this.el!.clientHeight - SCROLLBAR_WIDTH;
    const offsetX = this.hScrollbar.el!.scrollLeft;
    const offsetY = this.vScrollbar.el!.scrollTop;
    this.model.updateVisibleZone(width, height);
    // whenever the dimensions are changed, we need to reset the width/height
    // of the canvas manually, and reset its scaling.
    const dpr = window.devicePixelRatio || 1;
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

    const viewport = this.model.getters.getViewport(width, height, offsetX, offsetY);
    drawGrid(context, this.model.state, viewport);
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

  // ---------------------------------------------------------------------------
  // Zone selection with mouse
  // ---------------------------------------------------------------------------

  onMouseDown(ev: MouseEvent) {
    if (ev.button > 0) {
      // not main button, probably a context menu
      return;
    }
    const col = this.model.getters.getCol(ev.offsetX);
    const row = this.model.getters.getRow(ev.offsetY);
    if (col < 0 || row < 0) {
      return;
    }
    this.clickedCol = col;
    this.clickedRow = row;

    if (ev.shiftKey) {
      this.model.dispatch({ type: "ALTER_SELECTION", cell: [col, row] });
    } else {
      this.model.dispatch({ type: "SELECT_CELL", col, row, createNewRange: ev.ctrlKey });
    }
    let prevCol = col;
    let prevRow = row;
    const onMouseMove = ev => {
      const col = this.model.getters.getCol(ev.offsetX);
      const row = this.model.getters.getRow(ev.offsetY);
      if (col < 0 || row < 0) {
        return;
      }
      if (col !== prevCol || row !== prevRow) {
        prevCol = col;
        prevRow = row;
        this.model.dispatch({ type: "ALTER_SELECTION", cell: [col, row] });
      }
    };
    const onMouseUp = ev => {
      if (this.model.state.isSelectingRange) {
        if (this.composer.comp) {
          (this.composer.comp as Composer).addTextFromSelection();
        }
      }
      this.canvas.el!.removeEventListener("mousemove", onMouseMove);
      if (this.model.getters.isPaintingFormat()) {
        this.model.dispatch({
          type: "PASTE",
          target: this.model.state.selection.zones
        });
      }
    };

    this.canvas.el!.addEventListener("mousemove", onMouseMove);
    document.body.addEventListener("mouseup", onMouseUp, { once: true });
  }

  onDoubleClick(ev) {
    const col = this.model.getters.getCol(ev.offsetX);
    const row = this.model.getters.getRow(ev.offsetY);
    if (this.clickedCol === col && this.clickedRow === row) {
      this.model.dispatch({ type: "START_EDITION" });
    }
  }

  // ---------------------------------------------------------------------------
  // Keyboard interactions
  // ---------------------------------------------------------------------------

  processTabKey(ev: KeyboardEvent) {
    ev.preventDefault();
    const deltaX = ev.shiftKey ? -1 : 1;
    this.model.dispatch({ type: "MOVE_POSITION", deltaX, deltaY: 0 });
    return;
  }

  processArrows(ev: KeyboardEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    const deltaMap = {
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1]
    };
    const delta = deltaMap[ev.key];
    if (ev.shiftKey) {
      this.model.dispatch({ type: "ALTER_SELECTION", delta });
    } else {
      this.model.dispatch({ type: "MOVE_POSITION", deltaX: delta[0], deltaY: delta[1] });
    }

    if (this.model.state.isSelectingRange && this.composer.comp) {
      (this.composer.comp as Composer).addTextFromSelection();
    } else {
      this.processCopyFormat();
    }
  }

  onKeydown(ev: KeyboardEvent) {
    if (ev.key.startsWith("Arrow")) {
      this.processArrows(ev);
      return;
    }

    let keyDownString = "";
    if (ev.ctrlKey) keyDownString += "CTRL+";
    if (ev.metaKey) keyDownString += "CTRL+";
    if (ev.altKey) keyDownString += "ALT+";
    if (ev.shiftKey) keyDownString += "SHIFT+";
    keyDownString += ev.key.toUpperCase();

    let handler = this.keyDownMapping[keyDownString];
    if (handler) {
      ev.preventDefault();
      ev.stopPropagation();
      handler();
      return;
    }
    if (!keyDownMappingIgnore.includes(keyDownString)) {
      if (ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
        // if the user types a character on the grid, it means he wants to start composing the selected cell with that
        // character
        ev.preventDefault();
        ev.stopPropagation();
        this.model.dispatch({ type: "START_EDITION", text: ev.key });
      }
    }
  }

  copy(cut: boolean, ev: ClipboardEvent) {
    if (document.activeElement !== this.canvas.el) {
      return;
    }
    const type = cut ? "CUT" : "COPY";
    const target = this.model.state.selection.zones;
    this.model.dispatch({ type, target });
    const content = this.model.getters.getClipboardContent();
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
        const result = this.model.dispatch({
          type: "PASTE",
          target: this.model.state.selection.zones
        });
        if (result === "CANCELLED") {
          this.trigger("notify-user", {
            content: "This operation is not allowed with multiple selections."
          });
        }
      } else {
        this.model.dispatch({
          type: "PASTE_FROM_OS_CLIPBOARD",
          target: this.model.state.selection.zones,
          text: content
        });
      }
    }
  }
  toggleContextMenu(ev) {
    const col = this.model.getters.getCol(ev.offsetX);
    const row = this.model.getters.getRow(ev.offsetY);
    if (col < 0 || row < 0) {
      return;
    }
    const zones = this.model.state.selection.zones;
    const lastZone = zones[zones.length - 1];
    if (!isInside(col, row, lastZone)) {
      this.model.dispatch({ type: "SELECT_CELL", col, row });
    }
    ev.preventDefault();
    this.contextMenu.isOpen = true;
    this.contextMenu.position = { x: ev.offsetX, y: ev.offsetY };
    this.contextMenu.items = contextMenuRegistry
      .getAll()
      .filter(item => !item.isVisible || item.isVisible("CELL"));
  }
}
