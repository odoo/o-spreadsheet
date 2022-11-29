import * as owl from "@odoo/owl";
import { HEADER_HEIGHT, HEADER_WIDTH, MIN_COL_WIDTH, MIN_ROW_HEIGHT } from "../constants";
import { Col, Row, SpreadsheetEnv, Viewport } from "../types/index";
import { ContextMenuType } from "./grid";
import { startDnd } from "./helpers/drag_and_drop";

const Component = owl.Component;
const { xml, css } = owl.tags;
const { useState } = owl.hooks;

// -----------------------------------------------------------------------------
// Resizer component
// -----------------------------------------------------------------------------

abstract class AbstractResizer extends Component<any, SpreadsheetEnv> {
  PADDING: number = 0;
  MAX_SIZE_MARGIN: number = 0;
  MIN_ELEMENT_SIZE: number = 0;
  lastSelectedElement: number | null = null;
  lastElement: number | null = null;
  getters = this.env.getters;
  dispatch = this.env.dispatch;

  state = useState({
    isActive: <boolean>false,
    isResizing: <boolean>false,
    activeElement: <number>0,
    styleValue: <number>0,
    delta: <number>0,
  });

  abstract _getEvOffset(ev: MouseEvent): number;

  abstract _getStateOffset(): number;

  abstract _getViewportOffset(): number;

  abstract _getClientPosition(ev: MouseEvent): number;

  abstract _getElementIndex(index: number): number;

  abstract _getElement(index: number): Col | Row;

  abstract _getHeaderSize(): number;

  abstract _getMaxSize(): number;

  abstract _updateSize(): void;

  abstract _selectElement(index: number, ctrlKey: boolean): void;

  abstract _increaseSelection(index: number): void;

  abstract _fitElementSize(index: number): void;

  abstract _getType(): ContextMenuType;

  abstract _getActiveElements(): Set<number>;

  abstract _getXY(ev: MouseEvent): { x: number; y: number };

  _computeHandleDisplay(ev: MouseEvent) {
    const index = this._getEvOffset(ev);
    const elementIndex = this._getElementIndex(index);
    if (elementIndex < 0) {
      return;
    }
    const element = this._getElement(elementIndex);
    const offset = this._getStateOffset();
    if (
      index - (element.start - offset) < this.PADDING &&
      elementIndex !== this._getViewportOffset()
    ) {
      this.state.isActive = true;
      this.state.styleValue = element.start - offset - this._getHeaderSize();
      this.state.activeElement = elementIndex - 1;
    } else if (element.end - offset - index < this.PADDING) {
      this.state.isActive = true;
      this.state.styleValue = element.end - offset - this._getHeaderSize();
      this.state.activeElement = elementIndex;
    } else {
      this.state.isActive = false;
    }
  }

  onMouseMove(ev: MouseEvent) {
    if (this.state.isResizing) {
      return;
    }
    this._computeHandleDisplay(ev);
  }

  onMouseLeave() {
    this.state.isActive = this.state.isResizing;
  }

  onDblClick() {
    this._fitElementSize(this.state.activeElement);
    this.state.isResizing = false;
  }

  onMouseDown(ev: MouseEvent) {
    this.state.isResizing = true;
    this.state.delta = 0;

    const initialIndex = this._getClientPosition(ev);
    const styleValue = this.state.styleValue;
    const size = this._getElement(this.state.activeElement).size;
    const minSize = styleValue - size + this.MIN_ELEMENT_SIZE;
    const maxSize = this._getMaxSize();
    const onMouseUp = (ev: MouseEvent) => {
      this.state.isResizing = false;
      if (this.state.delta !== 0) {
        this._updateSize();
      }
    };
    const onMouseMove = (ev: MouseEvent) => {
      this.state.delta = this._getClientPosition(ev) - initialIndex;
      this.state.styleValue = styleValue + this.state.delta;
      if (this.state.styleValue < minSize) {
        this.state.styleValue = minSize;
        this.state.delta = this.MIN_ELEMENT_SIZE - size;
      }
      if (this.state.styleValue > maxSize) {
        this.state.styleValue = maxSize;
        this.state.delta = maxSize - styleValue;
      }
    };
    startDnd(onMouseMove, onMouseUp);
  }

  select(ev: MouseEvent) {
    if (ev.button > 0) {
      // not main button, probably a context menu
      return;
    }
    const index = this._getElementIndex(this._getEvOffset(ev));
    if (index < 0) {
      return;
    }
    this.lastElement = index;
    this.dispatch(ev.ctrlKey ? "START_SELECTION_EXPANSION" : "START_SELECTION");
    if (ev.shiftKey) {
      this._increaseSelection(index);
    } else {
      this.lastSelectedElement = index;
      this._selectElement(index, ev.ctrlKey);
    }
    const initialIndex = this._getClientPosition(ev);
    const initialOffset = this._getEvOffset(ev);
    const onMouseMoveSelect = (ev: MouseEvent) => {
      const offset = this._getClientPosition(ev) - initialIndex + initialOffset;
      const index = this._getElementIndex(offset);
      if (index !== this.lastElement && index !== -1) {
        this._increaseSelection(index);
        this.lastElement = index;
      }
    };
    const onMouseUpSelect = () => {
      this.lastElement = null;
      this.dispatch(ev.ctrlKey ? "PREPARE_SELECTION_EXPANSION" : "STOP_SELECTION");
    };
    startDnd(onMouseMoveSelect, onMouseUpSelect);
  }

  onMouseUp(ev: MouseEvent) {
    this.lastElement = null;
  }

  onContextMenu(ev: MouseEvent) {
    ev.preventDefault();
    const index = this._getElementIndex(this._getEvOffset(ev));
    if (index < 0) return;
    if (!this._getActiveElements().has(index)) {
      this.lastSelectedElement = index;
      this._selectElement(index, false);
    }
    const type = this._getType();
    const { x, y } = this._getXY(ev);
    this.trigger("open-contextmenu", { type, x, y });
  }
}

export class ColResizer extends AbstractResizer {
  static template = xml/* xml */ `
    <div class="o-col-resizer" t-on-mousemove.self="onMouseMove" t-on-mouseleave="onMouseLeave" t-on-mousedown.self.prevent="select"
      t-on-mouseup.self="onMouseUp" t-on-contextmenu.self="onContextMenu">
      <t t-if="state.isActive">
        <div class="o-handle" t-on-mousedown="onMouseDown" t-on-dblclick="onDblClick" t-on-contextmenu.prevent=""
          t-attf-style="left:{{state.styleValue - 2}}px;">
          <div class="dragging" t-if="state.isResizing"/>
        </div>
      </t>
    </div>`;

  static style = css/* scss */ `
    .o-col-resizer {
      position: absolute;
      top: 0;
      left: ${HEADER_WIDTH}px;
      right: 0;
      height: ${HEADER_HEIGHT}px;
      .o-handle {
        position: absolute;
        height: ${HEADER_HEIGHT}px;
        width: 4px;
        cursor: e-resize;
        background-color: #3266ca;
      }
      .dragging {
        top: ${HEADER_HEIGHT}px;
        position: absolute;
        margin-left: 2px;
        width: 1px;
        height: 10000px;
        background-color: #3266ca;
      }
    }
  `;

  constructor() {
    super(...arguments);
    this.PADDING = 15;
    this.MAX_SIZE_MARGIN = 90;
    this.MIN_ELEMENT_SIZE = MIN_COL_WIDTH;
  }

  _getEvOffset(ev: MouseEvent): number {
    return ev.offsetX + HEADER_WIDTH;
  }

  _getStateOffset(): number {
    return this.props.viewport.offsetX - HEADER_WIDTH;
  }

  _getViewportOffset(): number {
    return this.props.viewport.left;
  }

  _getClientPosition(ev: MouseEvent): number {
    return ev.clientX;
  }

  _getElementIndex(index: number): number {
    return this.getters.getColIndex(index, this.props.viewport.left);
  }

  _getElement(index: number): Col {
    return this.getters.getCol(this.getters.getActiveSheet(), index);
  }

  _getBottomRightValue(element: Col): number {
    return element.end;
  }

  _getHeaderSize(): number {
    return HEADER_WIDTH;
  }

  _getMaxSize(): number {
    return this.el!.clientWidth;
  }

  _updateSize(): void {
    const index = this.state.activeElement;
    const size = this.state.delta + this._getElement(index).size;
    const cols = this.getters.getActiveCols();
    this.dispatch("RESIZE_COLUMNS", {
      sheet: this.getters.getActiveSheet(),
      cols: cols.has(index) ? [...cols] : [index],
      size,
    });
  }

  _selectElement(index: number, ctrlKey: boolean): void {
    this.dispatch("SELECT_COLUMN", { index, createRange: ctrlKey });
  }

  _increaseSelection(index: number): void {
    this.dispatch("SELECT_COLUMN", { index, updateRange: true });
  }

  _fitElementSize(index: number): void {
    const cols = this.getters.getActiveCols();
    this.dispatch("AUTORESIZE_COLUMNS", {
      sheet: this.getters.getActiveSheet(),
      cols: cols.has(index) ? [...cols] : [index],
    });
  }

  _getType(): ContextMenuType {
    return "COL";
  }

  _getActiveElements(): Set<number> {
    return this.getters.getActiveCols();
  }

  _getXY(ev: MouseEvent): { x: number; y: number } {
    return {
      x: ev.offsetX + HEADER_WIDTH,
      y: ev.offsetY,
    };
  }
}

export class RowResizer extends AbstractResizer {
  static template = xml/* xml */ `
    <div class="o-row-resizer" t-on-mousemove.self="onMouseMove"  t-on-mouseleave="onMouseLeave" t-on-mousedown.self.prevent="select"
    t-on-mouseup.self="onMouseUp" t-on-contextmenu.self="onContextMenu">
      <t t-if="state.isActive">
        <div class="o-handle" t-on-mousedown="onMouseDown" t-on-dblclick="onDblClick" t-on-contextmenu.prevent=""
          t-attf-style="top:{{state.styleValue - 2}}px;">
          <div class="dragging" t-if="state.isResizing"/>
        </div>
      </t>
    </div>`;

  static style = css/* scss */ `
    .o-row-resizer {
      position: absolute;
      top: ${HEADER_HEIGHT}px;
      left: 0;
      right: 0;
      width: ${HEADER_WIDTH}px;
      height: 100%;
      .o-handle {
        position: absolute;
        height: 4px;
        width: ${HEADER_WIDTH}px;
        cursor: n-resize;
        background-color: #3266ca;
      }
      .dragging {
        left: ${HEADER_WIDTH}px;
        position: absolute;
        margin-top: 2px;
        width: 10000px;
        height: 1px;
        background-color: #3266ca;
      }
    }
  `;

  constructor() {
    super(...arguments);
    this.PADDING = 5;
    this.MAX_SIZE_MARGIN = 60;
    this.MIN_ELEMENT_SIZE = MIN_ROW_HEIGHT;
  }

  _getEvOffset(ev: MouseEvent): number {
    return ev.offsetY + HEADER_HEIGHT;
  }

  _getStateOffset(): number {
    return this.props.viewport.offsetY - HEADER_HEIGHT;
  }

  _getViewportOffset(): number {
    return this.props.viewport.top;
  }

  _getClientPosition(ev: MouseEvent): number {
    return ev.clientY;
  }

  _getElementIndex(index: number): number {
    return this.getters.getRowIndex(index, this.props.viewport.top);
  }

  _getElement(index: number): Row {
    return this.getters.getRow(this.getters.getActiveSheet(), index);
  }

  _getHeaderSize(): number {
    return HEADER_HEIGHT;
  }

  _getMaxSize(): number {
    return this.el!.clientHeight;
  }

  _updateSize(): void {
    const index = this.state.activeElement;
    const size = this.state.delta + this._getElement(index).size;
    const rows = this.getters.getActiveRows();
    this.dispatch("RESIZE_ROWS", {
      sheet: this.getters.getActiveSheet(),
      rows: rows.has(index) ? [...rows] : [index],
      size,
    });
  }

  _selectElement(index: number, ctrlKey: boolean): void {
    this.dispatch("SELECT_ROW", { index, createRange: ctrlKey });
  }

  _increaseSelection(index: number): void {
    this.dispatch("SELECT_ROW", { index, updateRange: true });
  }

  _fitElementSize(index: number): void {
    const rows = this.getters.getActiveRows();
    this.dispatch("AUTORESIZE_ROWS", {
      sheet: this.getters.getActiveSheet(),
      rows: rows.has(index) ? [...rows] : [index],
    });
  }

  _getType(): ContextMenuType {
    return "ROW";
  }

  _getActiveElements(): Set<number> {
    return this.getters.getActiveRows();
  }

  _getXY(ev: MouseEvent): { x: number; y: number } {
    return {
      x: ev.offsetX,
      y: ev.offsetY + HEADER_HEIGHT,
    };
  }
}

interface Props {
  viewport: Viewport;
}

export class Overlay extends Component<Props, SpreadsheetEnv> {
  static template = xml/* xml */ `
    <div class="o-overlay">
      <ColResizer viewport="props.viewport"/>
      <RowResizer viewport="props.viewport"/>
      <div class="all" t-on-mousedown.self="selectAll"/>
    </div>`;

  static style = css/* scss */ `
    .o-overlay {
      .all {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        width: ${HEADER_WIDTH}px;
        height: ${HEADER_HEIGHT}px;
      }
    }
  `;

  static components = { ColResizer, RowResizer };

  selectAll() {
    this.env.dispatch("SELECT_ALL");
  }
}
