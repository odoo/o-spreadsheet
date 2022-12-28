import { Component, useRef, useState } from "@odoo/owl";
import {
  ComponentsImportance,
  HEADER_HEIGHT,
  HEADER_WIDTH,
  ICON_EDGE_LENGTH,
  MIN_COL_WIDTH,
  MIN_ROW_HEIGHT,
  SELECTION_BORDER_COLOR,
  UNHIDE_ICON_EDGE_LENGTH,
} from "../../constants";
import {
  CommandResult,
  EdgeScrollInfo,
  HeaderDimensions,
  HeaderIndex,
  Pixel,
  Ref,
  SpreadsheetChildEnv,
} from "../../types/index";
import { ContextMenuType } from "../grid/grid";
import { css } from "../helpers/css";
import { dragAndDropBeyondTheViewport, startDnd } from "../helpers/drag_and_drop";
import { MergeErrorMessage } from "../translations_terms";

// -----------------------------------------------------------------------------
// Resizer component
// -----------------------------------------------------------------------------

interface ResizerState {
  resizerIsActive: boolean;
  isResizing: boolean;
  isMoving: boolean;
  isSelecting: boolean;
  waitingForMove: boolean;
  activeElement: Pixel;
  draggerLinePosition: Pixel;
  draggerShadowPosition: Pixel;
  draggerShadowThickness: number;
  delta: number;
  base: number;
}

interface ResizerProps {
  onOpenContextMenu: (type: ContextMenuType, x: Pixel, y: Pixel) => void;
}

abstract class AbstractResizer extends Component<ResizerProps, SpreadsheetChildEnv> {
  PADDING: number = 0;
  MAX_SIZE_MARGIN: number = 0;
  MIN_ELEMENT_SIZE: number = 0;
  lastSelectedElementIndex: HeaderIndex | null = null;

  state: ResizerState = useState({
    resizerIsActive: false,
    isResizing: false,
    isMoving: false,
    isSelecting: false,
    waitingForMove: false,
    activeElement: 0,
    draggerLinePosition: 0,
    draggerShadowPosition: 0,
    draggerShadowThickness: 0,
    delta: 0,
    base: 0,
  });

  abstract _getEvOffset(ev: MouseEvent): Pixel;

  abstract _getViewportOffset(): Pixel;

  abstract _getClientPosition(ev: MouseEvent): Pixel;

  abstract _getElementIndex(position: Pixel): HeaderIndex;

  abstract _getSelectedZoneStart(): HeaderIndex;

  abstract _getSelectedZoneEnd(): HeaderIndex;

  abstract _getEdgeScroll(position: Pixel): EdgeScrollInfo;

  abstract _getDimensionsInViewport(index: HeaderIndex): HeaderDimensions;

  abstract _getElementSize(index: HeaderIndex): Pixel;

  abstract _getMaxSize(): Pixel;

  abstract _updateSize(): void;

  abstract _moveElements(): void;

  abstract _selectElement(index: HeaderIndex, ctrlKey: boolean): void;

  abstract _increaseSelection(index: HeaderIndex): void;

  abstract _fitElementSize(index: HeaderIndex): void;

  abstract _getType(): ContextMenuType;

  abstract _getActiveElements(): Set<HeaderIndex>;

  abstract _getPreviousVisibleElement(index: HeaderIndex): HeaderIndex;

  _computeHandleDisplay(ev: MouseEvent) {
    const position = this._getEvOffset(ev);

    const elementIndex = this._getElementIndex(position);
    if (elementIndex < 0) {
      return;
    }
    const dimensions = this._getDimensionsInViewport(elementIndex);

    if (position - dimensions.start < this.PADDING && elementIndex !== this._getViewportOffset()) {
      this.state.resizerIsActive = true;
      this.state.draggerLinePosition = dimensions.start;
      this.state.activeElement = this._getPreviousVisibleElement(elementIndex);
    } else if (dimensions.end - position < this.PADDING) {
      this.state.resizerIsActive = true;
      this.state.draggerLinePosition = dimensions.end;
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

  onDblClick(ev: MouseEvent) {
    this._fitElementSize(this.state.activeElement);
    this.state.isResizing = false;
    this._computeHandleDisplay(ev);
    this._computeGrabDisplay(ev);
  }

  onMouseDown(ev: MouseEvent) {
    this.state.isResizing = true;
    this.state.delta = 0;

    const initialPosition = this._getClientPosition(ev);
    const styleValue = this.state.draggerLinePosition;
    const size = this._getElementSize(this.state.activeElement);
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
    if (this.env.model.getters.getEditionMode() === "editing") {
      this.env.model.selection.getBackToDefault();
    }
    this.startSelection(ev, index);
  }

  private startMovement(ev: MouseEvent) {
    this.state.waitingForMove = false;
    this.state.isMoving = true;
    const startDimensions = this._getDimensionsInViewport(this._getSelectedZoneStart());
    const endDimensions = this._getDimensionsInViewport(this._getSelectedZoneEnd());
    const defaultPosition = startDimensions.start;
    this.state.draggerLinePosition = defaultPosition;
    this.state.base = this._getSelectedZoneStart();
    this.state.draggerShadowPosition = defaultPosition;
    this.state.draggerShadowThickness = endDimensions.end - startDimensions.start;
    const mouseMoveMovement = (col: HeaderIndex, row: HeaderIndex) => {
      let elementIndex = this._getType() === "COL" ? col : row;
      if (elementIndex >= 0) {
        // define draggerLinePosition
        const dimensions = this._getDimensionsInViewport(elementIndex);
        if (elementIndex <= this._getSelectedZoneStart()) {
          this.state.draggerLinePosition = dimensions.start;
          this.state.draggerShadowPosition = dimensions.start;
          this.state.base = elementIndex;
        } else if (this._getSelectedZoneEnd() < elementIndex) {
          this.state.draggerLinePosition = dimensions.end;
          this.state.draggerShadowPosition = dimensions.end - this.state.draggerShadowThickness;
          this.state.base = elementIndex + 1;
        } else {
          this.state.draggerLinePosition = startDimensions.start;
          this.state.draggerShadowPosition = startDimensions.start;
          this.state.base = this._getSelectedZoneStart();
        }
      }
    };
    const mouseUpMovement = () => {
      this.state.isMoving = false;
      if (this.state.base !== this._getSelectedZoneStart()) {
        this._moveElements();
      }
      this._computeGrabDisplay(ev);
    };
    dragAndDropBeyondTheViewport(this.env, mouseMoveMovement, mouseUpMovement);
  }

  private startSelection(ev: MouseEvent, index: HeaderIndex) {
    this.state.isSelecting = true;
    if (ev.shiftKey) {
      this._increaseSelection(index);
    } else {
      this._selectElement(index, ev.ctrlKey);
    }
    this.lastSelectedElementIndex = index;

    const mouseMoveSelect = (col: HeaderIndex, row: HeaderIndex) => {
      let newIndex = this._getType() === "COL" ? col : row;
      if (newIndex !== this.lastSelectedElementIndex && newIndex !== -1) {
        this._increaseSelection(newIndex);
        this.lastSelectedElementIndex = newIndex;
      }
    };
    const mouseUpSelect = () => {
      this.state.isSelecting = false;
      this.lastSelectedElementIndex = null;
      this.env.model.dispatch(
        ev.ctrlKey ? "PREPARE_SELECTION_INPUT_EXPANSION" : "STOP_SELECTION_INPUT"
      );
      this._computeGrabDisplay(ev);
    };
    dragAndDropBeyondTheViewport(this.env, mouseMoveSelect, mouseUpSelect);
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
    this.props.onOpenContextMenu(type, ev.clientX, ev.clientY);
  }
}

css/* scss */ `
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
      z-index: ${ComponentsImportance.Grid + 1};
      background-color: lightgrey;
    }
    .o-unhide > svg {
      position: relative;
      top: calc(${UNHIDE_ICON_EDGE_LENGTH}px / 2 - ${ICON_EDGE_LENGTH}px / 2);
    }
  }
`;

export class ColResizer extends AbstractResizer {
  static template = "o-spreadsheet-ColResizer";

  private colResizerRef!: Ref<HTMLElement>;

  setup() {
    super.setup();
    this.colResizerRef = useRef("colResizer");
    this.PADDING = 15;
    this.MAX_SIZE_MARGIN = 90;
    this.MIN_ELEMENT_SIZE = MIN_COL_WIDTH;
  }

  _getEvOffset(ev: MouseEvent): Pixel {
    return ev.offsetX;
  }

  _getViewportOffset(): Pixel {
    return this.env.model.getters.getActiveMainViewport().left;
  }

  _getClientPosition(ev: MouseEvent): Pixel {
    return ev.clientX;
  }

  _getElementIndex(position: Pixel): HeaderIndex {
    return this.env.model.getters.getColIndex(position);
  }

  _getSelectedZoneStart(): HeaderIndex {
    return this.env.model.getters.getSelectedZone().left;
  }

  _getSelectedZoneEnd(): HeaderIndex {
    return this.env.model.getters.getSelectedZone().right;
  }

  _getEdgeScroll(position: Pixel): EdgeScrollInfo {
    return this.env.model.getters.getEdgeScrollCol(position, position, position);
  }

  _getDimensionsInViewport(index: HeaderIndex): HeaderDimensions {
    return this.env.model.getters.getColDimensionsInViewport(
      this.env.model.getters.getActiveSheetId(),
      index
    );
  }

  _getElementSize(index: HeaderIndex): Pixel {
    return this.env.model.getters.getColSize(this.env.model.getters.getActiveSheetId(), index);
  }

  _getMaxSize(): Pixel {
    return this.colResizerRef.el!.clientWidth;
  }

  _updateSize(): void {
    const index = this.state.activeElement;
    const size = this.state.delta + this._getElementSize(index);
    const cols = this.env.model.getters.getActiveCols();
    this.env.model.dispatch("RESIZE_COLUMNS_ROWS", {
      dimension: "COL",
      sheetId: this.env.model.getters.getActiveSheetId(),
      elements: cols.has(index) ? [...cols] : [index],
      size,
    });
  }

  _moveElements(): void {
    const elements: HeaderIndex[] = [];
    const start = this._getSelectedZoneStart();
    const end = this._getSelectedZoneEnd();
    for (let colIndex = start; colIndex <= end; colIndex++) {
      elements.push(colIndex);
    }
    const result = this.env.model.dispatch("MOVE_COLUMNS_ROWS", {
      sheetId: this.env.model.getters.getActiveSheetId(),
      dimension: "COL",
      base: this.state.base,
      elements,
    });
    if (!result.isSuccessful && result.reasons.includes(CommandResult.WillRemoveExistingMerge)) {
      this.env.raiseError(MergeErrorMessage);
    }
  }

  _selectElement(index: HeaderIndex, ctrlKey: boolean): void {
    this.env.model.selection.selectColumn(index, ctrlKey ? "newAnchor" : "overrideSelection");
  }

  _increaseSelection(index: HeaderIndex): void {
    this.env.model.selection.selectColumn(index, "updateAnchor");
  }

  _fitElementSize(index: HeaderIndex): void {
    const cols = this.env.model.getters.getActiveCols();
    this.env.model.dispatch("AUTORESIZE_COLUMNS", {
      sheetId: this.env.model.getters.getActiveSheetId(),
      cols: cols.has(index) ? [...cols] : [index],
    });
  }

  _getType(): ContextMenuType {
    return "COL";
  }

  _getActiveElements(): Set<HeaderIndex> {
    return this.env.model.getters.getActiveCols();
  }

  _getPreviousVisibleElement(index: HeaderIndex): HeaderIndex {
    const sheetId = this.env.model.getters.getActiveSheetId();
    let row: HeaderIndex;
    for (row = index - 1; row >= 0; row--) {
      if (!this.env.model.getters.isColHidden(sheetId, row)) {
        break;
      }
    }
    return row;
  }

  unhide(hiddenElements: HeaderIndex[]) {
    this.env.model.dispatch("UNHIDE_COLUMNS_ROWS", {
      sheetId: this.env.model.getters.getActiveSheetId(),
      elements: hiddenElements,
      dimension: "COL",
    });
  }

  unhideStyleValue(hiddenIndex: HeaderIndex): Pixel {
    return this._getDimensionsInViewport(hiddenIndex).start;
  }
}

css/* scss */ `
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
      z-index: ${ComponentsImportance.Grid + 1};
      background-color: lightgrey;
    }
  }
`;

export class RowResizer extends AbstractResizer {
  static template = "o-spreadsheet-RowResizer";

  setup() {
    super.setup();
    this.rowResizerRef = useRef("rowResizer");
    this.PADDING = 5;
    this.MAX_SIZE_MARGIN = 60;
    this.MIN_ELEMENT_SIZE = MIN_ROW_HEIGHT;
  }

  private rowResizerRef!: Ref<HTMLElement>;

  _getEvOffset(ev: MouseEvent): Pixel {
    return ev.offsetY;
  }

  _getViewportOffset(): Pixel {
    return this.env.model.getters.getActiveMainViewport().top;
  }

  _getClientPosition(ev: MouseEvent): Pixel {
    return ev.clientY;
  }

  _getElementIndex(position: Pixel): HeaderIndex {
    return this.env.model.getters.getRowIndex(position);
  }

  _getSelectedZoneStart(): HeaderIndex {
    return this.env.model.getters.getSelectedZone().top;
  }

  _getSelectedZoneEnd(): HeaderIndex {
    return this.env.model.getters.getSelectedZone().bottom;
  }

  _getEdgeScroll(position: Pixel): EdgeScrollInfo {
    return this.env.model.getters.getEdgeScrollRow(position, position, position);
  }

  _getDimensionsInViewport(index: HeaderIndex): HeaderDimensions {
    return this.env.model.getters.getRowDimensionsInViewport(
      this.env.model.getters.getActiveSheetId(),
      index
    );
  }

  _getElementSize(index: HeaderIndex): Pixel {
    return this.env.model.getters.getRowSize(this.env.model.getters.getActiveSheetId(), index);
  }

  _getMaxSize(): Pixel {
    return this.rowResizerRef.el!.clientHeight;
  }

  _updateSize(): void {
    const index = this.state.activeElement;
    const size = this.state.delta + this._getElementSize(index);
    const rows = this.env.model.getters.getActiveRows();
    this.env.model.dispatch("RESIZE_COLUMNS_ROWS", {
      dimension: "ROW",
      sheetId: this.env.model.getters.getActiveSheetId(),
      elements: rows.has(index) ? [...rows] : [index],
      size,
    });
  }

  _moveElements(): void {
    const elements: HeaderIndex[] = [];
    const start = this._getSelectedZoneStart();
    const end = this._getSelectedZoneEnd();
    for (let rowIndex = start; rowIndex <= end; rowIndex++) {
      elements.push(rowIndex);
    }
    const result = this.env.model.dispatch("MOVE_COLUMNS_ROWS", {
      sheetId: this.env.model.getters.getActiveSheetId(),
      dimension: "ROW",
      base: this.state.base,
      elements,
    });
    if (!result.isSuccessful && result.reasons.includes(CommandResult.WillRemoveExistingMerge)) {
      this.env.raiseError(MergeErrorMessage);
    }
  }

  _selectElement(index: HeaderIndex, ctrlKey: boolean): void {
    this.env.model.selection.selectRow(index, ctrlKey ? "newAnchor" : "overrideSelection");
  }

  _increaseSelection(index: HeaderIndex): void {
    this.env.model.selection.selectRow(index, "updateAnchor");
  }

  _fitElementSize(index: HeaderIndex): void {
    const rows = this.env.model.getters.getActiveRows();
    this.env.model.dispatch("AUTORESIZE_ROWS", {
      sheetId: this.env.model.getters.getActiveSheetId(),
      rows: rows.has(index) ? [...rows] : [index],
    });
  }

  _getType(): ContextMenuType {
    return "ROW";
  }

  _getActiveElements(): Set<HeaderIndex> {
    return this.env.model.getters.getActiveRows();
  }

  _getPreviousVisibleElement(index: HeaderIndex): HeaderIndex {
    const sheetId = this.env.model.getters.getActiveSheetId();
    let row: HeaderIndex;
    for (row = index - 1; row >= 0; row--) {
      if (!this.env.model.getters.isRowHidden(sheetId, row)) {
        break;
      }
    }
    return row;
  }

  unhide(hiddenElements: HeaderIndex[]) {
    this.env.model.dispatch("UNHIDE_COLUMNS_ROWS", {
      sheetId: this.env.model.getters.getActiveSheetId(),
      dimension: "ROW",
      elements: hiddenElements,
    });
  }

  unhideStyleValue(hiddenIndex: HeaderIndex): Pixel {
    return this._getDimensionsInViewport(hiddenIndex).start;
  }
}

css/* scss */ `
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

export class HeadersOverlay extends Component<any, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-HeadersOverlay";
  static components = { ColResizer, RowResizer };

  selectAll() {
    this.env.model.selection.selectAll();
  }
}
