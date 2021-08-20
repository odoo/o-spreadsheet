import * as owl from "@odoo/owl";
import {
  HEADER_HEIGHT,
  HEADER_WIDTH,
  ICON_EDGE_LENGTH,
  MIN_COL_WIDTH,
  MIN_ROW_HEIGHT,
  SELECTION_BORDER_COLOR,
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
  lastSelectedElementIndex: number | null = null;
  getters = this.env.getters;
  dispatch = this.env.dispatch;

  state = useState({
    resizerIsActive: <boolean>false,
    isResizing: <boolean>false,
    isMoving: <boolean>false,
    isSelecting: <boolean>false,
    waitingForMove: <boolean>false,
    activeElement: <number>0,
    draggerLinePosition: <number>0,
    draggerShadowPosition: <number>0,
    draggerShadowThickness: <number>0,
    delta: <number>0,
    base: <number>0,
  });

  abstract _getEvOffset(ev: MouseEvent): number;

  abstract _getStateOffset(): number;

  abstract _getViewportOffset(): number;

  abstract _getClientPosition(ev: MouseEvent): number;

  abstract _getElementIndex(position: number): number;

  abstract _getSelectedZoneStart(): number;

  abstract _getSelectedZoneEnd(): number;

  abstract _getEdgeScroll(position: number): EdgeScrollInfo;

  abstract _getBoundaries(): { first: number; last: number };

  abstract _getElement(index: number): Col | Row;

  abstract _getHeaderSize(): number;

  abstract _getMaxSize(): number;

  abstract _updateSize(): void;

  abstract _moveElements(): void;

  abstract _selectElement(index: number, ctrlKey: boolean): void;

  abstract _increaseSelection(index: number): void;

  abstract _adjustViewport(index: number): void;

  abstract _fitElementSize(index: number): void;

  abstract _getType(): ContextMenuType;

  abstract _getActiveElements(): Set<number>;

  abstract _getXY(ev: MouseEvent): { x: number; y: number };

  abstract _getPreviousVisibleElement(index: number): number;

  _computeHandleDisplay(ev: MouseEvent) {
    const position = this._getEvOffset(ev);

    const elementIndex = this._getElementIndex(position);
    if (elementIndex < 0) {
      return;
    }
    const element = this._getElement(elementIndex);
    const offset = this._getStateOffset();

    if (
      position - (element.start - offset) < this.PADDING &&
      elementIndex !== this._getViewportOffset()
    ) {
      this.state.resizerIsActive = true;
      this.state.draggerLinePosition = element.start - offset - this._getHeaderSize();
      this.state.activeElement = this._getPreviousVisibleElement(elementIndex);
    } else if (element.end - offset - position < this.PADDING) {
      this.state.resizerIsActive = true;
      this.state.draggerLinePosition = element.end - offset - this._getHeaderSize();
      this.state.activeElement = elementIndex;
    } else {
      this.state.resizerIsActive = false;
    }
  }

  _computeGrabDisplay(ev: MouseEvent) {
    const index = this._getElementIndex(this._getEvOffset(ev));
    const activeElements = this._getActiveElements();
    const selectedZoneStart = this._getSelectedZoneStart();
    const selectedZoneEnd = this._getSelectedZoneEnd();
    if (activeElements.has(selectedZoneStart)) {
      if (selectedZoneStart <= index && index <= selectedZoneEnd) {
        this.state.waitingForMove = true;
        return;
      }
    }
    this.state.waitingForMove = false;
  }

  onMouseMove(ev: MouseEvent) {
    if (this.state.isResizing || this.state.isMoving || this.state.isSelecting) {
      return;
    }
    this._computeHandleDisplay(ev);
    this._computeGrabDisplay(ev);
  }

  onMouseLeave() {
    this.state.resizerIsActive = this.state.isResizing;
    this.state.waitingForMove = false;
  }

  onDblClick() {
    this._fitElementSize(this.state.activeElement);
    this.state.isResizing = false;
  }

  onMouseDown(ev: MouseEvent) {
    this.state.isResizing = true;
    this.state.delta = 0;

    const initialPosition = this._getClientPosition(ev);
    const styleValue = this.state.draggerLinePosition;
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
      this.state.delta = this._getClientPosition(ev) - initialPosition;
      this.state.draggerLinePosition = styleValue + this.state.delta;
      if (this.state.draggerLinePosition < minSize) {
        this.state.draggerLinePosition = minSize;
        this.state.delta = this.MIN_ELEMENT_SIZE - size;
      }
      if (this.state.draggerLinePosition > maxSize) {
        this.state.draggerLinePosition = maxSize;
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
    if (this.state.waitingForMove === true) {
      this.startMovement(ev);
      return;
    }
    this.startSelection(ev, index);
  }

  private startMovement(ev: MouseEvent) {
    this.state.waitingForMove = false;
    this.state.isMoving = true;
    const startElement = this._getElement(this._getSelectedZoneStart());
    const endElement = this._getElement(this._getSelectedZoneEnd());
    const initialPosition = this._getClientPosition(ev);
    const defaultPosition = startElement.start - this._getStateOffset() - this._getHeaderSize();
    this.state.draggerLinePosition = defaultPosition;
    this.state.base = this._getSelectedZoneStart();
    this.state.draggerShadowPosition = defaultPosition;
    this.state.draggerShadowThickness = endElement.end - startElement.start;
    const mouseMoveMovement = (elementIndex: number, currentEv: MouseEvent) => {
      if (elementIndex >= 0) {
        // define draggerLinePosition
        const element = this._getElement(elementIndex);
        const offset = this._getStateOffset() + this._getHeaderSize();
        if (elementIndex <= this._getSelectedZoneStart()) {
          this.state.draggerLinePosition = element.start - offset;
          this.state.base = elementIndex;
        } else if (this._getSelectedZoneEnd() < elementIndex) {
          this.state.draggerLinePosition = element.end - offset;
          this.state.base = elementIndex + 1;
        } else {
          this.state.draggerLinePosition = startElement.start - offset;
          this.state.base = this._getSelectedZoneStart();
        }
        // define draggerShadowPosition
        const delta = this._getClientPosition(currentEv) - initialPosition;
        this.state.draggerShadowPosition = Math.max(defaultPosition + delta, 0);
      }
    };
    const mouseUpMovement = (finalEv: MouseEvent) => {
      this.state.isMoving = false;
      if (this.state.base !== this._getSelectedZoneStart()) {
        this._moveElements();
      }
      this._computeGrabDisplay(finalEv);
    };
    this.dragOverlayBeyondTheViewport(ev, mouseMoveMovement, mouseUpMovement);
  }

  private startSelection(ev: MouseEvent, index: number) {
    this.state.isSelecting = true;
    this.dispatch(ev.ctrlKey ? "START_SELECTION_EXPANSION" : "START_SELECTION");
    if (ev.shiftKey) {
      this._increaseSelection(index);
    } else {
      this._selectElement(index, ev.ctrlKey);
    }
    this.lastSelectedElementIndex = index;

    const mouseMoveSelect = (elementIndex: number, currentEv) => {
      if (elementIndex !== this.lastSelectedElementIndex && elementIndex !== -1) {
        this._increaseSelection(elementIndex);
        this.lastSelectedElementIndex = elementIndex;
      }
    };
    const mouseUpSelect = () => {
      this.state.isSelecting = false;
      this.lastSelectedElementIndex = null;
      this.dispatch(ev.ctrlKey ? "PREPARE_SELECTION_EXPANSION" : "STOP_SELECTION");
      this._computeGrabDisplay(ev);
    };

    this.dragOverlayBeyondTheViewport(ev, mouseMoveSelect, mouseUpSelect);
  }

  private dragOverlayBeyondTheViewport(
    ev: MouseEvent,
    cbMouseMove: (elementIndex: number, currentEv: MouseEvent) => void,
    cbMouseUp: (finalEv: MouseEvent) => void
  ) {
    let timeOutId: any = null;
    let currentEv: MouseEvent;
    const initialPosition = this._getClientPosition(ev);
    const initialOffset = this._getEvOffset(ev);

    const onMouseMove = (ev: MouseEvent) => {
      currentEv = ev;
      if (timeOutId) {
        return;
      }
      const position = this._getClientPosition(currentEv) - initialPosition + initialOffset;
      const EdgeScrollInfo = this._getEdgeScroll(position);
      const { first, last } = this._getBoundaries();
      let elementIndex;
      if (EdgeScrollInfo.canEdgeScroll) {
        elementIndex = EdgeScrollInfo.direction > 0 ? last : first - 1;
      } else {
        elementIndex = this._getElementIndex(position);
      }

      cbMouseMove(elementIndex, currentEv);

      // adjust viewport if necessary
      if (EdgeScrollInfo.canEdgeScroll) {
        this._adjustViewport(EdgeScrollInfo.direction);
        timeOutId = setTimeout(() => {
          timeOutId = null;
          onMouseMove(currentEv);
        }, Math.round(EdgeScrollInfo.delay));
      }
    };

    const onMouseUp = (finalEv: MouseEvent) => {
      clearTimeout(timeOutId);
      cbMouseUp(finalEv);
    };

    startDnd(onMouseMove, onMouseUp);
  }

  onMouseUp(ev: MouseEvent) {
    this.lastSelectedElementIndex = null;
  }

  onContextMenu(ev: MouseEvent) {
    ev.preventDefault();
    const index = this._getElementIndex(this._getEvOffset(ev));
    if (index < 0) return;
    if (!this._getActiveElements().has(index)) {
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
      t-on-mouseup.self="onMouseUp" t-on-contextmenu.self="onContextMenu" t-att-class="{'o-grab': state.waitingForMove, 'o-dragging': state.isMoving, }">
      <div t-if="state.isMoving" class="dragging-col-line" t-attf-style="left:{{state.draggerLinePosition}}px;"/>
      <div t-if="state.isMoving" class="dragging-col-shadow" t-attf-style="left:{{state.draggerShadowPosition}}px; width:{{state.draggerShadowThickness}}px"/>
      <t t-if="state.resizerIsActive">
        <div class="o-handle" t-on-mousedown="onMouseDown" t-on-dblclick="onDblClick" t-on-contextmenu.prevent=""
        t-attf-style="left:{{state.draggerLinePosition - 2}}px;">
        <div class="dragging-resizer" t-if="state.isResizing"/>
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
      &.o-dragging {
        cursor: grabbing;
      }
      &.o-grab {
        cursor: grab;
      }
      .dragging-col-line {
        top: ${HEADER_HEIGHT}px;
        position: absolute;
        width: 2px;
        height: 10000px;
        background-color: black;
      }
      .dragging-col-shadow {
        top: ${HEADER_HEIGHT}px;
        position: absolute;
        height: 10000px;
        background-color: black;
        opacity: 0.1;
      }
      .o-handle {
        position: absolute;
        height: ${HEADER_HEIGHT}px;
        width: 4px;
        cursor: e-resize;
        background-color: ${SELECTION_BORDER_COLOR};
      }
      .dragging-resizer {
        top: ${HEADER_HEIGHT}px;
        position: absolute;
        margin-left: 2px;
        width: 1px;
        height: 10000px;
        background-color: ${SELECTION_BORDER_COLOR};
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
    return this.getters.getActiveSnappedViewport().offsetX - HEADER_WIDTH;
  }

  _getViewportOffset(): number {
    return this.getters.getActiveSnappedViewport().left;
  }

  _getClientPosition(ev: MouseEvent): number {
    return ev.clientX;
  }

  _getElementIndex(index: number): number {
    return this.getters.getColIndex(index, this.getters.getActiveSnappedViewport().left);
  }

  _getSelectedZoneStart(): number {
    return this.getters.getSelectedZone().left;
  }

  _getSelectedZoneEnd(): number {
    return this.getters.getSelectedZone().right;
  }

  _getEdgeScroll(position: number): EdgeScrollInfo {
    return this.getters.getEdgeScrollCol(position);
  }

  _getBoundaries(): { first: number; last: number } {
    const { left, right } = this.getters.getActiveSnappedViewport();
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

  _moveElements(): void {
    const elements: number[] = [];
    const start = this._getSelectedZoneStart();
    const end = this._getSelectedZoneEnd();
    for (let colIndex = start; colIndex <= end; colIndex++) {
      elements.push(colIndex);
    }
    this.dispatch("MOVE_COLUMNS_ROWS", {
      sheetId: this.getters.getActiveSheetId(),
      dimension: "COL",
      base: this.state.base,
      elements,
    });
  }

  _selectElement(index: number, ctrlKey: boolean): void {
    this.dispatch("SELECT_COLUMN", { index, createRange: ctrlKey });
  }

  _increaseSelection(index: number): void {
    this.dispatch("SELECT_COLUMN", { index, updateRange: true });
  }

  _adjustViewport(direction: number): void {
    const { left, offsetY } = this.getters.getActiveSnappedViewport();
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
    t-on-mouseup.self="onMouseUp" t-on-contextmenu.self="onContextMenu" t-att-class="{'o-grab': state.waitingForMove, 'o-dragging': state.isMoving}">
      <div t-if="state.isMoving" class="dragging-row-line" t-attf-style="top:{{state.draggerLinePosition}}px;"/>
      <div t-if="state.isMoving" class="dragging-row-shadow" t-attf-style="top:{{state.draggerShadowPosition}}px; height:{{state.draggerShadowThickness}}px;"/>
      <t t-if="state.resizerIsActive">
        <div class="o-handle" t-on-mousedown="onMouseDown" t-on-dblclick="onDblClick" t-on-contextmenu.prevent=""
          t-attf-style="top:{{state.draggerLinePosition - 2}}px;">
          <div class="dragging-resizer" t-if="state.isResizing"/>
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
      &.o-dragging {
        cursor: grabbing;
      }
      &.o-grab {
        cursor: grab;
      }
      .dragging-row-line {
        left: ${HEADER_WIDTH}px;
        position: absolute;
        width: 10000px;
        height: 2px;
        background-color: black;
      }
      .dragging-row-shadow {
        left: ${HEADER_WIDTH}px;
        position: absolute;
        width: 10000px;
        background-color: black;
        opacity: 0.1;
      }
      .o-handle {
        position: absolute;
        height: 4px;
        width: ${HEADER_WIDTH}px;
        cursor: n-resize;
        background-color: ${SELECTION_BORDER_COLOR};
      }
      .dragging-resizer {
        left: ${HEADER_WIDTH}px;
        position: absolute;
        margin-top: 2px;
        width: 10000px;
        height: 1px;
        background-color: ${SELECTION_BORDER_COLOR};
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
    return this.getters.getActiveSnappedViewport().offsetY - HEADER_HEIGHT;
  }

  _getViewportOffset(): number {
    return this.getters.getActiveSnappedViewport().top;
  }

  _getClientPosition(ev: MouseEvent): number {
    return ev.clientY;
  }

  _getElementIndex(index: number): number {
    return this.getters.getRowIndex(index, this.getters.getActiveSnappedViewport().top);
  }

  _getSelectedZoneStart(): number {
    return this.getters.getSelectedZone().top;
  }

  _getSelectedZoneEnd(): number {
    return this.getters.getSelectedZone().bottom;
  }

  _getEdgeScroll(position: number): EdgeScrollInfo {
    return this.getters.getEdgeScrollRow(position);
  }

  _getBoundaries(): { first: number; last: number } {
    const { top, bottom } = this.getters.getActiveSnappedViewport();
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

  _moveElements(): void {
    const elements: number[] = [];
    const start = this._getSelectedZoneStart();
    const end = this._getSelectedZoneEnd();
    for (let rowIndex = start; rowIndex <= end; rowIndex++) {
      elements.push(rowIndex);
    }
    this.dispatch("MOVE_COLUMNS_ROWS", {
      sheetId: this.getters.getActiveSheetId(),
      dimension: "ROW",
      base: this.state.base,
      elements,
    });
  }

  _selectElement(index: number, ctrlKey: boolean): void {
    this.dispatch("SELECT_ROW", { index, createRange: ctrlKey });
  }

  _increaseSelection(index: number): void {
    this.dispatch("SELECT_ROW", { index, updateRange: true });
  }

  _adjustViewport(direction: number): void {
    const { top, offsetX } = this.getters.getActiveSnappedViewport();
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
