import * as owl from "@odoo/owl";

import { GridModel } from "../model";
import { Col, Row } from "../types/index";
import { MIN_ROW_HEIGHT, MIN_COL_WIDTH, HEADER_WIDTH, HEADER_HEIGHT } from "../constants";

const { Component } = owl;
const { xml, css } = owl.tags;
const { useState } = owl.hooks;

// -----------------------------------------------------------------------------
// Resizer component
// -----------------------------------------------------------------------------

abstract class AbstractResizer extends Component<any, any> {
  model: GridModel = this.props.model;
  PADDING: number = 0;
  MAX_SIZE_MARGIN: number = 0;
  MIN_ELEMENT_SIZE: number = 0;
  lastSelectedElement: number | null = null;
  lastElement: number | null = null;

  state = useState({
    isActive: <boolean>false,
    isResizing: <boolean>false,
    activeElement: <number>0,
    styleValue: <number>0,
    delta: <number>0
  });

  abstract _getEvOffset(ev: MouseEvent): number;

  abstract _getStateOffset(): number;

  abstract _getViewportOffset(): number;

  abstract _getClientPosition(ev: MouseEvent): number;

  abstract _getElementIndex(index: number): number;

  abstract _getElement(index: number): Col | Row;

  abstract _getElementSize(index: number): number;

  abstract _getTopLeftValue(element: Col | Row): number;

  abstract _getBottomRightValue(element: Col | Row): number;

  abstract _getHeaderSize(): number;

  abstract _getMaxSize(): number;

  abstract _updateSize(): void;

  abstract _selectElement(index: number, ctrlKey: boolean): void;

  abstract _increaseSelection(index: number): void;

  abstract _fitElementSize(index: number): void;

  _computeHandleDisplay(ev: MouseEvent) {
    const index = this._getEvOffset(ev);
    const elementIndex = this._getElementIndex(index);
    if (elementIndex < 0) {
      return;
    }
    const element = this._getElement(elementIndex);
    const offset = this._getStateOffset();
    if (
      index - (this._getTopLeftValue(element) - offset) < this.PADDING &&
      elementIndex !== this._getViewportOffset()
    ) {
      this.state.isActive = true;
      this.state.styleValue = this._getTopLeftValue(element) - offset - this._getHeaderSize();
      this.state.activeElement = elementIndex - 1;
    } else if (this._getBottomRightValue(element) - offset - index < this.PADDING) {
      this.state.isActive = true;
      this.state.styleValue = this._getBottomRightValue(element) - offset - this._getHeaderSize();
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
    const size = this._getElementSize(this.state.activeElement);
    const minSize = styleValue - size + this.MIN_ELEMENT_SIZE;
    const maxSize = this._getMaxSize();
    const onMouseUp = ev => {
      this.state.isResizing = false;
      window.removeEventListener("mousemove", onMouseMove);
      if (this.state.delta !== 0) {
        this._updateSize();
      }
    };
    const onMouseMove = ev => {
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
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp, { once: true });
  }

  select(ev: MouseEvent) {
    const index = this._getElementIndex(this._getEvOffset(ev));
    if (index < 0) {
      return;
    }
    this.lastElement = index;
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
    const onMouseUpSelect = (ev: MouseEvent) => {
      window.removeEventListener("mousemove", onMouseMoveSelect);
      this.lastElement = null;
    };
    window.addEventListener("mousemove", onMouseMoveSelect);
    window.addEventListener("mouseup", onMouseUpSelect, { once: true });
  }

  onMouseUp(ev: MouseEvent) {
    this.lastElement = null;
  }
}

export class ColResizer extends AbstractResizer {
  static template = xml/* xml */ `
    <div class="o-col-resizer" t-on-mousemove.self="onMouseMove" t-on-mouseleave="onMouseLeave" t-on-mousedown.self="select"
      t-on-mouseup.self="onMouseUp">
      <t t-if="state.isActive">
        <div class="o-handle" t-on-mousedown="onMouseDown" t-on-dblclick="onDblClick"
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
    return this.model.state.offsetX;
  }

  _getViewportOffset(): number {
    return this.model.state.viewport.left;
  }

  _getClientPosition(ev: MouseEvent): number {
    return ev.clientX;
  }

  _getElementIndex(index: number): number {
    return this.model.getters.getCol(index);
  }

  _getElement(index: number): Col {
    return this.model.state.cols[index];
  }

  _getElementSize(index: number): number {
    return this.model.getters.getColSize(index);
  }

  _getTopLeftValue(element: Col): number {
    return element.left;
  }

  _getBottomRightValue(element: Col): number {
    return element.right;
  }

  _getHeaderSize(): number {
    return HEADER_WIDTH;
  }

  _getMaxSize(): number {
    return this.el!.clientWidth;
  }

  _updateSize(): void {
    const index = this.state.activeElement;
    const size = this.state.delta + this._getElementSize(index);
    const cols = this.model.getters.getActiveCols();
    this.model.dispatch({
      type: "RESIZE_COLUMNS",
      sheet: this.model.state.activeSheet,
      cols: cols.has(index) ? [...cols] : [index],
      size
    });
  }

  _selectElement(index: number, ctrlKey: boolean): void {
    this.model.dispatch({ type: "SELECT_COLUMN", index, createRange: ctrlKey });
  }

  _increaseSelection(index: number): void {
    this.model.dispatch({ type: "SELECT_COLUMN", index, updateRange: true });
  }

  _fitElementSize(index: number): void {
    const cols = this.model.getters.getActiveCols();
    this.model.dispatch({
      type: "AUTORESIZE_COLUMNS",
      sheet: this.model.state.activeSheet,
      cols: cols.has(index) ? [...cols] : [index]
    });
  }
}

export class RowResizer extends AbstractResizer {
  static template = xml/* xml */ `
    <div class="o-row-resizer" t-on-mousemove.self="onMouseMove"  t-on-mouseleave="onMouseLeave" t-on-mousedown.self="select">
      <t t-if="state.isActive">
        <div class="o-handle" t-on-mousedown="onMouseDown" t-on-dblclick="onDblClick"
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
    return this.model.state.offsetY;
  }

  _getViewportOffset(): number {
    return this.model.state.viewport.top;
  }

  _getClientPosition(ev: MouseEvent): number {
    return ev.clientY;
  }

  _getElementIndex(index: number): number {
    return this.model.getters.getRow(index);
  }

  _getElement(index: number): Row {
    return this.model.state.rows[index];
  }

  _getElementSize(index: number): number {
    return this.model.getters.getRowSize(index);
  }

  _getTopLeftValue(element: Row): number {
    return element.top;
  }

  _getBottomRightValue(element: Row): number {
    return element.bottom;
  }

  _getHeaderSize(): number {
    return HEADER_HEIGHT;
  }

  _getMaxSize(): number {
    return this.el!.clientHeight;
  }

  _updateSize(): void {
    const index = this.state.activeElement;
    const size = this.state.delta + this._getElementSize(index);
    const rows = this.model.getters.getActiveRows();
    this.model.dispatch({
      type: "RESIZE_ROWS",
      sheet: this.model.state.activeSheet,
      rows: rows.has(index) ? [...rows] : [index],
      size
    });
  }

  _selectElement(index: number, ctrlKey: boolean): void {
    this.model.dispatch({ type: "SELECT_ROW", index, createRange: ctrlKey });
  }

  _increaseSelection(index: number): void {
    this.model.dispatch({ type: "SELECT_ROW", index, updateRange: true });
  }

  _fitElementSize(index: number): void {
    const rows = this.model.getters.getActiveRows();
    this.model.dispatch({
      type: "AUTORESIZE_ROWS",
      sheet: this.model.state.activeSheet,
      rows: rows.has(index) ? [...rows] : [index]
    });
  }
}

export class Overlay extends Component<any, any> {
  static template = xml/* xml */ `
    <div class="o-overlay">
      <ColResizer model="props.model"/>
      <RowResizer model="props.model"/>
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

  model: GridModel = this.props.model;

  selectAll() {
    this.model.dispatch({ type: "SELECT_ALL" });
  }
}
