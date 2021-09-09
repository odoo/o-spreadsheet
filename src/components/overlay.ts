import * as owl from "@odoo/owl";
import {
  HEADER_HEIGHT,
  HEADER_WIDTH,
  ICON_EDGE_LENGTH,
  MIN_COL_WIDTH,
  MIN_ROW_HEIGHT,
  UNHIDE_ICON_EDGE_LENGTH,
} from "../constants";
import { Col, EdgeScrollInfo, Row, SpreadsheetEnv } from "../types/index";
import { ContextMenuType } from "./grid";
import { startDnd } from "./helpers/drag_and_drop";
import * as icons from "./icons";

const { Component } = owl;
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
    resizerIsActive: <boolean>false,
    isResizing: <boolean>false,
    activeElement: <number>0,
    resizerStyleValue: <number>0,
    delta: <number>0,
  });

  abstract _getEvOffset(ev: MouseEvent): number;

  abstract _getStateOffset(): number;

  abstract _getViewportOffset(): number;

  abstract _getClientPosition(ev: MouseEvent): number;

  abstract _getElementIndex(index: number): number;

  abstract _getEdgeScroll(position: number): EdgeScrollInfo;

  abstract _getBoundaries(): { first: number; last: number };

  abstract _getElement(index: number): Col | Row;

  abstract _getHeaderSize(): number;

  abstract _getMaxSize(): number;

  abstract _updateSize(): void;

  abstract _selectElement(index: number, ctrlKey: boolean): void;

  abstract _increaseSelection(index: number): void;

  abstract _adjustViewport(index: number): void;

  abstract _fitElementSize(index: number): void;

  abstract _getType(): ContextMenuType;

  abstract _getActiveElements(): Set<number>;

  abstract _getXY(ev: MouseEvent): { x: number; y: number };

  abstract _getPreviousVisibleElement(index: number): number;

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
      this.state.resizerIsActive = true;
      this.state.resizerStyleValue = element.start - offset - this._getHeaderSize();
      this.state.activeElement = this._getPreviousVisibleElement(elementIndex);
    } else if (element.end - offset - index < this.PADDING) {
      this.state.resizerIsActive = true;
      this.state.resizerStyleValue = element.end - offset - this._getHeaderSize();
      this.state.activeElement = elementIndex;
    } else {
      this.state.resizerIsActive = false;
    }
  }

  onMouseMove(ev: MouseEvent) {
    if (this.state.isResizing) {
      return;
    }
    this._computeHandleDisplay(ev);
  }

  onMouseLeave() {
    this.state.resizerIsActive = this.state.isResizing;
  }

  onDblClick() {
    this._fitElementSize(this.state.activeElement);
    this.state.isResizing = false;
  }

  onMouseDown(ev: MouseEvent) {
    this.state.isResizing = true;
    this.state.delta = 0;

    const initialIndex = this._getClientPosition(ev);
    const styleValue = this.state.resizerStyleValue;
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
      this.state.resizerStyleValue = styleValue + this.state.delta;
      if (this.state.resizerStyleValue < minSize) {
        this.state.resizerStyleValue = minSize;
        this.state.delta = this.MIN_ELEMENT_SIZE - size;
      }
      if (this.state.resizerStyleValue > maxSize) {
        this.state.resizerStyleValue = maxSize;
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
    let timeOutId: any = null;
    let currentEv: MouseEvent;

    const onMouseMoveSelect = (ev: MouseEvent) => {
      currentEv = ev;
      if (timeOutId) {
        return;
      }
      const offset = this._getClientPosition(currentEv) - initialIndex + initialOffset;
      const EdgeScrollInfo = this._getEdgeScroll(offset);
      const { first, last } = this._getBoundaries();
      let index;
      if (EdgeScrollInfo.canEdgeScroll) {
        index = EdgeScrollInfo.direction > 0 ? last : first - 1;
      } else {
        index = this._getElementIndex(offset);
      }
      if (index !== this.lastElement && index !== -1) {
        this._increaseSelection(index);
        this.lastElement = index;
      }
      if (EdgeScrollInfo.canEdgeScroll) {
        this._adjustViewport(EdgeScrollInfo.direction);
        timeOutId = setTimeout(() => {
          timeOutId = null;
          onMouseMoveSelect(currentEv);
        }, Math.round(EdgeScrollInfo.delay));
      }
    };
    const onMouseUpSelect = () => {
      clearTimeout(timeOutId);
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
      <t t-if="state.resizerIsActive">
        <div class="o-handle" t-on-mousedown="onMouseDown" t-on-dblclick="onDblClick" t-on-contextmenu.prevent=""
        t-attf-style="left:{{state.resizerStyleValue - 2}}px;">
        <div class="dragging" t-if="state.isResizing"/>
        </div>
      </t>
      <t t-foreach="getters.getHiddenColsGroups(getters.getActiveSheetId())" t-as="hiddenItem" t-key="hiddenItem_index">
        <t t-if="!hiddenItem.includes(0)">
          <div class="o-unhide" t-att-data-index="hiddenItem_index" t-attf-style="left:{{unhideStyleValue(hiddenItem[0]) - 17}}px; margin-right:6px;" t-on-click="unhide(hiddenItem)">
          ${icons.TRIANGLE_LEFT_ICON}
          </div>
        </t>
        <t t-if="!hiddenItem.includes(getters.getActiveSheet().cols.length-1)">
          <div class="o-unhide" t-att-data-index="hiddenItem_index" t-attf-style="left:{{unhideStyleValue(hiddenItem[0]) + 3}}px;" t-on-click="unhide(hiddenItem)">
          ${icons.TRIANGLE_RIGHT_ICON}
          </div>
        </t>
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
      .o-unhide {
        width: ${UNHIDE_ICON_EDGE_LENGTH}px;
        height: ${UNHIDE_ICON_EDGE_LENGTH}px;
        position: absolute;
        overflow: hidden;
        border-radius: 2px;
        top: calc(${HEADER_HEIGHT}px / 2 - ${UNHIDE_ICON_EDGE_LENGTH}px / 2);
      }
      .o-unhide:hover {
        z-index: 1;
        background-color: lightgrey;
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
    return this.getters.getActiveViewport().offsetX - HEADER_WIDTH;
  }

  _getViewportOffset(): number {
    return this.getters.getActiveViewport().left;
  }

  _getClientPosition(ev: MouseEvent): number {
    return ev.clientX;
  }

  _getElementIndex(index: number): number {
    return this.getters.getColIndex(index, this.getters.getActiveViewport().offsetX);
  }

  _getEdgeScroll(position: number): EdgeScrollInfo {
    return this.getters.getEdgeScrollCol(position);
  }

  _getBoundaries(): { first: number; last: number } {
    const { left, right } = this.getters.getActiveViewport();
    return { first: left, last: right };
  }

  _getElement(index: number): Col {
    return this.getters.getCol(this.getters.getActiveSheetId(), index)!;
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
    this.dispatch("RESIZE_COLUMNS_ROWS", {
      dimension: "COL",
      sheetId: this.getters.getActiveSheetId(),
      elements: cols.has(index) ? [...cols] : [index],
      size,
    });
  }

  _selectElement(index: number, ctrlKey: boolean): void {
    this.dispatch("SELECT_COLUMN", { index, createRange: ctrlKey });
  }

  _increaseSelection(index: number): void {
    this.dispatch("SELECT_COLUMN", { index, updateRange: true });
  }

  _adjustViewport(direction: number): void {
    const { left, offsetY } = this.getters.getActiveViewport();
    const { cols } = this.getters.getActiveSheet();
    const offsetX = cols[left + direction].start;
    this.dispatch("SET_VIEWPORT_OFFSET", { offsetX, offsetY });
  }

  _fitElementSize(index: number): void {
    const cols = this.getters.getActiveCols();
    this.dispatch("AUTORESIZE_COLUMNS", {
      sheetId: this.getters.getActiveSheetId(),
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
  _getPreviousVisibleElement(index: number): number {
    const cols = this.getters.getActiveSheet().cols.slice(0, index);
    const step = cols.reverse().findIndex((col) => !col.isHidden);
    return index - 1 - step;
  }

  unhide(hiddenElements: number[]) {
    this.dispatch("UNHIDE_COLUMNS_ROWS", {
      sheetId: this.getters.getActiveSheetId(),
      elements: hiddenElements,
      dimension: "COL",
    });
  }

  unhideStyleValue(hiddenIndex: number): number {
    const col = this.getters.getCol(this.getters.getActiveSheetId(), hiddenIndex);
    const offset = this._getStateOffset();
    return col!.start - offset - this._getHeaderSize();
  }
}

export class RowResizer extends AbstractResizer {
  static template = xml/* xml */ `
    <div class="o-row-resizer" t-on-mousemove.self="onMouseMove" t-on-mouseleave="onMouseLeave" t-on-mousedown.self.prevent="select"
    t-on-mouseup.self="onMouseUp" t-on-contextmenu.self="onContextMenu">
      <t t-if="state.resizerIsActive">
        <div class="o-handle" t-on-mousedown="onMouseDown" t-on-dblclick="onDblClick" t-on-contextmenu.prevent=""
          t-attf-style="top:{{state.resizerStyleValue - 2}}px;">
          <div class="dragging" t-if="state.isResizing"/>
        </div>
      </t>
      <t t-foreach="getters.getHiddenRowsGroups(getters.getActiveSheetId())" t-as="hiddenItem" t-key="hiddenItem_index">
        <t t-if="!hiddenItem.includes(0)">
          <div class="o-unhide" t-att-data-index="hiddenItem_index" t-attf-style="top:{{unhideStyleValue(hiddenItem[0]) - 17}}px;" t-on-click="unhide(hiddenItem)">
          ${icons.TRIANGLE_UP_ICON}
          </div>
        </t>
        <t t-if="!hiddenItem.includes(getters.getActiveSheet().rows.length-1)">
         <div class="o-unhide" t-att-data-index="hiddenItem_index"  t-attf-style="top:{{unhideStyleValue(hiddenItem[0]) + 3}}px;" t-on-click="unhide(hiddenItem)">
         ${icons.TRIANGLE_DOWN_ICON}
         </div>
        </t>
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
      .o-unhide {
        width: ${UNHIDE_ICON_EDGE_LENGTH}px;
        height: ${UNHIDE_ICON_EDGE_LENGTH}px;
        position: absolute;
        overflow: hidden;
        border-radius: 2px;
        left: calc(${HEADER_WIDTH}px - ${UNHIDE_ICON_EDGE_LENGTH}px - 2px);
      }
      .o-unhide > svg {
        position: relative;
        left: calc(${UNHIDE_ICON_EDGE_LENGTH}px / 2 - ${ICON_EDGE_LENGTH}px / 2);
        top: calc(${UNHIDE_ICON_EDGE_LENGTH}px / 2 - ${ICON_EDGE_LENGTH}px / 2);
      }
      .o-unhide:hover {
        z-index: 1;
        background-color: lightgrey;
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
    return this.getters.getActiveViewport().offsetY - HEADER_HEIGHT;
  }

  _getViewportOffset(): number {
    return this.getters.getActiveViewport().top;
  }

  _getClientPosition(ev: MouseEvent): number {
    return ev.clientY;
  }

  _getElementIndex(index: number): number {
    return this.getters.getRowIndex(index, this.getters.getActiveViewport().offsetY);
  }

  _getEdgeScroll(position: number): EdgeScrollInfo {
    return this.getters.getEdgeScrollRow(position);
  }

  _getBoundaries(): { first: number; last: number } {
    const { top, bottom } = this.getters.getActiveViewport();
    return { first: top, last: bottom };
  }

  _getElement(index: number): Row {
    return this.getters.getRow(this.getters.getActiveSheetId(), index)!;
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
    this.dispatch("RESIZE_COLUMNS_ROWS", {
      dimension: "ROW",
      sheetId: this.getters.getActiveSheetId(),
      elements: rows.has(index) ? [...rows] : [index],
      size,
    });
  }

  _selectElement(index: number, ctrlKey: boolean): void {
    this.dispatch("SELECT_ROW", { index, createRange: ctrlKey });
  }

  _increaseSelection(index: number): void {
    this.dispatch("SELECT_ROW", { index, updateRange: true });
  }

  _adjustViewport(direction: number): void {
    const { top, offsetX } = this.getters.getActiveViewport();
    const { rows } = this.getters.getActiveSheet();
    const offsetY = rows[top + direction].start;
    this.dispatch("SET_VIEWPORT_OFFSET", { offsetX, offsetY });
  }

  _fitElementSize(index: number): void {
    const rows = this.getters.getActiveRows();
    this.dispatch("AUTORESIZE_ROWS", {
      sheetId: this.getters.getActiveSheetId(),
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
  _getPreviousVisibleElement(index: number): number {
    const rows = this.getters.getActiveSheet().rows.slice(0, index);
    const step = rows.reverse().findIndex((row) => !row.isHidden);
    return index - 1 - step;
  }

  unhide(hiddenElements: number[]) {
    this.dispatch("UNHIDE_COLUMNS_ROWS", {
      sheetId: this.getters.getActiveSheetId(),
      dimension: "ROW",
      elements: hiddenElements,
    });
  }

  unhideStyleValue(hiddenIndex: number): number {
    const row = this.getters.getRow(this.getters.getActiveSheetId(), hiddenIndex);
    const offset = this._getStateOffset();
    return row!.start - offset - this._getHeaderSize();
  }
}

export class Overlay extends Component<any, SpreadsheetEnv> {
  static template = xml/* xml */ `
    <div class="o-overlay">
      <ColResizer />
      <RowResizer />
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
