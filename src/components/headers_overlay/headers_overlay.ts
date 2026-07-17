import { proxy, signal, useProps } from "@odoo/owl";
import { MIN_COL_WIDTH, MIN_ROW_HEIGHT } from "../../constants";
import { Component } from "../../owl3_compatibility_layer";
import { useStore } from "../../store_engine/store_hooks";
import { ViewportsStore } from "../../stores/viewports_store";
import { CommandResult } from "../../types/commands";
import { HeaderDimensions, HeaderIndex, Pixel } from "../../types/misc";
import { EdgeScrollInfo } from "../../types/rendering";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { Store } from "../../types/store_engine";
import { ContextMenuType } from "../grid/grid";
import { cssPropertiesToCss } from "../helpers/css";
import { isCtrlKey } from "../helpers/dom_helpers";
import { startDnd } from "../helpers/drag_and_drop";
import { useDragAndDropBeyondTheViewport } from "../helpers/drag_and_drop_grid_hook";
import { withZoom, ZoomedMouseEvent } from "../helpers/zoom";
import { types } from "../props_validation";
import { MergeErrorMessage, TableHeaderMoveErrorMessage } from "../translations_terms";
import { ComposerFocusStore } from "./../composer/composer_focus_store";
import { UnhideColumnHeaders, UnhideRowHeaders } from "./unhide_headers";

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
  position: "before" | "after";
}

export const resizerPropsDefinition = {
  onOpenContextMenu: types.function<(type: ContextMenuType, x: Pixel, y: Pixel) => void>(),
};

abstract class AbstractResizer extends Component<SpreadsheetChildEnv> {
  protected props = useProps(resizerPropsDefinition);
  private composerFocusStore!: Store<ComposerFocusStore>;
  protected viewStore!: Store<ViewportsStore>;

  PADDING: number = 0;
  MAX_SIZE_MARGIN: number = 0;
  MIN_ELEMENT_SIZE: number = 0;
  lastSelectedElementIndex: HeaderIndex | null = null;

  state: ResizerState = proxy({
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
    position: "before",
  });

  dragNDropGrid = useDragAndDropBeyondTheViewport(this.env);

  abstract _getEvOffset(zoomedMouseEvent: ZoomedMouseEvent<MouseEvent>): Pixel;

  abstract _getViewportOffset(): Pixel;

  abstract _getClientPosition(zoomedMouseEvent: ZoomedMouseEvent<MouseEvent>): Pixel;

  abstract _getElementIndex(position: Pixel): HeaderIndex;

  abstract _getSelectedZoneStart(): HeaderIndex;

  abstract _getSelectedZoneEnd(): HeaderIndex;

  abstract _getEdgeScroll(position: Pixel): EdgeScrollInfo;

  abstract _getDimensionsInViewport(index: HeaderIndex): HeaderDimensions;

  abstract _getElementSize(index: HeaderIndex): Pixel;

  abstract _getMaxSize(): Pixel;

  abstract _updateSize(): void;

  abstract _moveElements(): void;

  abstract _selectElement(index: HeaderIndex, addDistinctHeader: boolean): void;

  abstract _increaseSelection(index: HeaderIndex): void;

  abstract _fitElementSize(index: HeaderIndex): void;

  abstract _getType(): ContextMenuType;

  abstract _getActiveElements(): Set<HeaderIndex>;

  abstract _getPreviousVisibleElement(index: HeaderIndex): HeaderIndex;

  setup(): void {
    this.composerFocusStore = useStore(ComposerFocusStore);
    this.viewStore = useStore(ViewportsStore);
  }

  _computeHandleDisplay(zoomedMouseEvent: ZoomedMouseEvent<MouseEvent>) {
    const position = this._getEvOffset(zoomedMouseEvent);

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

  _computeGrabDisplay(zoomedMouseEvent: ZoomedMouseEvent<MouseEvent>) {
    if (isCtrlKey(zoomedMouseEvent.ev)) {
      this.state.waitingForMove = false;
      return;
    }
    const index = this._getElementIndex(this._getEvOffset(zoomedMouseEvent));
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
    if (
      this.env.isMobile() ||
      this.env.model.getters.isReadonly() ||
      this.state.isResizing ||
      this.state.isMoving ||
      this.state.isSelecting
    ) {
      return;
    }
    const zoomedMouseEvent = withZoom(this.env, ev);
    this._computeHandleDisplay(zoomedMouseEvent);
    this._computeGrabDisplay(zoomedMouseEvent);
  }

  onMouseLeave() {
    this.state.resizerIsActive = this.state.isResizing;
    this.state.waitingForMove = false;
  }

  onDblClick(ev: MouseEvent) {
    const zoomedMouseEvent = withZoom(this.env, ev);
    this._fitElementSize(this.state.activeElement);
    this.state.isResizing = false;
    this._computeHandleDisplay(zoomedMouseEvent);
    this._computeGrabDisplay(zoomedMouseEvent);
  }

  onMouseDown(ev: MouseEvent) {
    if (ev.button !== 0) {
      return;
    }
    this.state.isResizing = true;
    this.state.delta = 0;
    const zoomedMouseEvent = withZoom(this.env, ev);

    const initialPosition = this._getClientPosition(zoomedMouseEvent);
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
      this.state.delta = this._getClientPosition(withZoom(this.env, ev)) - initialPosition;
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

  onClick(ev: MouseEvent) {
    if (!this.env.isMobile()) {
      return;
    }
    if (ev.button > 0) {
      // not main button, probably a context menu
      return;
    }
    const zoomedMouseEvent = withZoom(this.env, ev);
    const index = this._getElementIndex(this._getEvOffset(zoomedMouseEvent));
    this._selectElement(index, false);
  }

  select(ev: PointerEvent) {
    if (this.env.isMobile()) {
      return;
    }
    if (ev.button > 0) {
      // not main button, probably a context menu
      return;
    }
    const zoomedMouseEvent = withZoom(this.env, ev);
    const index = this._getElementIndex(this._getEvOffset(zoomedMouseEvent));
    if (index < 0) {
      return;
    }
    if (this.env.model.getters.isReadonly()) {
      this._selectElement(index, false);
      return;
    }
    if (!isCtrlKey(ev) && this.state.waitingForMove) {
      if (!this.env.model.getters.isGridSelectionActive()) {
        this._selectElement(index, false);
      } else {
        // FIXME: Consider reintroducing this feature for all type of selection if we find
        // a way to have the grid selection follow the other selections evolution
        this.startMovement(ev);
      }
      return;
    }
    if (this.composerFocusStore.activeComposer.editionMode === "editing") {
      this.env.model.selection.getBackToDefault();
    }
    this.startSelection(ev, index);
  }

  private startMovement(ev: PointerEvent) {
    this.state.waitingForMove = false;
    this.state.isMoving = true;
    const zoomedMouseEvent = withZoom(this.env, ev);
    const startDimensions = this._getDimensionsInViewport(this._getSelectedZoneStart());
    const endDimensions = this._getDimensionsInViewport(this._getSelectedZoneEnd());
    const defaultPosition = startDimensions.start;
    this.state.draggerLinePosition = defaultPosition;
    this.state.base = this._getSelectedZoneStart();
    this.state.draggerShadowPosition = defaultPosition;
    this.state.draggerShadowThickness = endDimensions.end - startDimensions.start;
    const mouseMoveMovement = (col: HeaderIndex, row: HeaderIndex) => {
      const elementIndex = this._getType() === "COL" ? col : row;
      if (elementIndex >= 0) {
        // define draggerLinePosition
        const dimensions = this._getDimensionsInViewport(elementIndex);
        if (elementIndex <= this._getSelectedZoneStart()) {
          this.state.draggerLinePosition = dimensions.start;
          this.state.draggerShadowPosition = dimensions.start;
          this.state.base = elementIndex;
          this.state.position = "before";
        } else if (this._getSelectedZoneEnd() < elementIndex) {
          this.state.draggerLinePosition = dimensions.end;
          this.state.draggerShadowPosition = dimensions.end - this.state.draggerShadowThickness;
          this.state.base = elementIndex;
          this.state.position = "after";
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
      const zoomedMouseEvent = withZoom(this.env, ev);
      this._computeGrabDisplay(zoomedMouseEvent);
    };
    this.dragNDropGrid.start(zoomedMouseEvent, mouseMoveMovement, mouseUpMovement);
  }

  private startSelection(ev: PointerEvent, index: HeaderIndex) {
    if (this.env.isMobile()) {
      return;
    }
    this.state.isSelecting = true;
    if (ev.shiftKey) {
      this._increaseSelection(index);
    } else {
      this._selectElement(index, isCtrlKey(ev));
    }
    this.lastSelectedElementIndex = index;
    const zoomedMouseEvent = withZoom(this.env, ev);

    const mouseMoveSelect = (col: HeaderIndex, row: HeaderIndex) => {
      const newIndex = this._getType() === "COL" ? col : row;
      if (newIndex !== this.lastSelectedElementIndex && newIndex !== -1) {
        this._increaseSelection(newIndex);
        this.lastSelectedElementIndex = newIndex;
      }
    };
    const mouseUpSelect = () => {
      this.env.model.selection.commitSelection();
      this.state.isSelecting = false;
      this.lastSelectedElementIndex = null;
      this._computeGrabDisplay(zoomedMouseEvent);
    };
    this.dragNDropGrid.start(zoomedMouseEvent, mouseMoveSelect, mouseUpSelect);
  }

  onContextMenu(ev: MouseEvent) {
    ev.preventDefault();
    const index = this._getElementIndex(this._getEvOffset(withZoom(this.env, ev)));
    if (index < 0) {
      return;
    }
    if (!this._getActiveElements().has(index)) {
      this._selectElement(index, false);
    }
    const type = this._getType();
    this.props.onOpenContextMenu(type, ev.clientX, ev.clientY);
  }
}

export class ColResizer extends AbstractResizer {
  static template = "o-spreadsheet-ColResizer";
  static components = { UnhideColumnHeaders };

  private colResizerRef = signal<HTMLElement | null>(null);

  setup() {
    super.setup();
    this.PADDING = 15;
    this.MAX_SIZE_MARGIN = 90;
    this.MIN_ELEMENT_SIZE = MIN_COL_WIDTH;
  }

  get sheetId() {
    return this.env.model.getters.getActiveSheetId();
  }

  _getEvOffset(zoomedMouseEvent: ZoomedMouseEvent<MouseEvent>): Pixel {
    return zoomedMouseEvent.offsetX;
  }

  _getViewportOffset(): Pixel {
    return this.viewStore.activeMainViewport.left;
  }

  _getClientPosition(zoomedMouseEvent: ZoomedMouseEvent<MouseEvent>): Pixel {
    return zoomedMouseEvent.clientX;
  }

  _getElementIndex(position: Pixel): HeaderIndex {
    return this.viewStore.viewports.getColIndex(this.sheetId, position);
  }

  _getSelectedZoneStart(): HeaderIndex {
    return this.env.model.getters.getSelectedZone().left;
  }

  _getSelectedZoneEnd(): HeaderIndex {
    return this.env.model.getters.getSelectedZone().right;
  }

  _getEdgeScroll(position: Pixel): EdgeScrollInfo {
    return this.viewStore.viewports.getEdgeScrollCol(this.sheetId, position, position, position);
  }

  _getDimensionsInViewport(index: HeaderIndex): HeaderDimensions {
    return this.viewStore.viewports.getColDimensionsInViewport(this.sheetId, index);
  }

  _getElementSize(index: HeaderIndex): Pixel {
    return this.env.model.getters.getColSize(this.sheetId, index);
  }

  _getMaxSize(): Pixel {
    return this.colResizerRef()?.clientWidth ?? 0;
  }

  _updateSize(): void {
    const index = this.state.activeElement;
    const size = this.state.delta + this._getElementSize(index);
    const cols = this.env.model.getters.getActiveCols();
    this.env.model.dispatch("RESIZE_COLUMNS_ROWS", {
      dimension: "COL",
      sheetId: this.sheetId,
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
      sheetId: this.sheetId,
      sheetName: this.env.model.getters.getActiveSheetName(),
      dimension: "COL",
      base: this.state.base,
      elements,
      position: this.state.position,
    });
    if (!result.isSuccessful && result.reasons.includes(CommandResult.WillRemoveExistingMerge)) {
      this.env.raiseError(MergeErrorMessage);
    }
  }

  _selectElement(index: HeaderIndex, addDistinctHeader: boolean): void {
    this.env.model.selection.selectColumn(
      index,
      addDistinctHeader ? "newAnchor" : "overrideSelection"
    );
  }

  _increaseSelection(index: HeaderIndex): void {
    this.env.model.selection.selectColumn(index, "updateAnchor");
  }

  _fitElementSize(index: HeaderIndex): void {
    const cols = this.env.model.getters.getActiveCols();
    this.env.model.dispatch("AUTORESIZE_COLUMNS", {
      sheetId: this.sheetId,
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
    const sheetId = this.sheetId;
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
      sheetId: this.sheetId,
      elements: hiddenElements,
      dimension: "COL",
    });
  }

  get mainUnhideHeadersProps() {
    const { left, right } = this.viewStore.activeMainViewport;
    const { xSplit } = this.env.model.getters.getPaneDivisions(this.sheetId);
    const hiddenGroups = this.env.model.getters.getHiddenColsGroups(this.sheetId);
    const index = hiddenGroups.findIndex((group) => group[0] >= xSplit - 1);
    return {
      headersGroups: index === -1 ? [] : hiddenGroups.slice(index),
      offset: this.viewStore.mainViewportCoordinates.x,
      headerRange: { start: left, end: right },
    };
  }

  get frozenUnhideHeadersProps() {
    const { xSplit } = this.env.model.getters.getPaneDivisions(this.sheetId);
    const hiddenGroups = this.env.model.getters.getHiddenColsGroups(this.sheetId);
    const index = hiddenGroups.findIndex((group) => group[0] >= xSplit - 1);

    return {
      headersGroups: index === -1 ? hiddenGroups : hiddenGroups.slice(0, index + 1),
      headerRange: { start: 0, end: xSplit - 1 },
    };
  }

  get frozenContainerStyle() {
    return cssPropertiesToCss({
      width: this.viewStore.mainViewportCoordinates.x + "px",
    });
  }

  get hasFrozenPane(): boolean {
    return this.env.model.getters.getPaneDivisions(this.sheetId).xSplit > 0;
  }
}

export class RowResizer extends AbstractResizer {
  static template = "o-spreadsheet-RowResizer";
  static components = { UnhideRowHeaders };

  private rowResizerRef = signal<HTMLElement | null>(null);

  setup() {
    super.setup();
    this.PADDING = 5;
    this.MAX_SIZE_MARGIN = 60;
    this.MIN_ELEMENT_SIZE = MIN_ROW_HEIGHT;
  }

  get sheetId() {
    return this.env.model.getters.getActiveSheetId();
  }

  _getEvOffset(zoomedMouseEvent: ZoomedMouseEvent<MouseEvent>): Pixel {
    return zoomedMouseEvent.offsetY;
  }

  _getViewportOffset(): Pixel {
    return this.viewStore.activeMainViewport.top;
  }

  _getClientPosition(zoomedMouseEvent: ZoomedMouseEvent<MouseEvent>): Pixel {
    return zoomedMouseEvent.clientY;
  }

  _getElementIndex(position: Pixel): HeaderIndex {
    return this.viewStore.viewports.getRowIndex(this.sheetId, position);
  }

  _getSelectedZoneStart(): HeaderIndex {
    return this.env.model.getters.getSelectedZone().top;
  }

  _getSelectedZoneEnd(): HeaderIndex {
    return this.env.model.getters.getSelectedZone().bottom;
  }

  _getEdgeScroll(position: Pixel): EdgeScrollInfo {
    return this.viewStore.viewports.getEdgeScrollRow(this.sheetId, position, position, position);
  }

  _getDimensionsInViewport(index: HeaderIndex): HeaderDimensions {
    return this.viewStore.viewports.getRowDimensionsInViewport(this.sheetId, index);
  }

  _getElementSize(index: HeaderIndex): Pixel {
    return this.env.model.getters.getRowSize(this.sheetId, index);
  }

  _getMaxSize(): Pixel {
    return this.rowResizerRef()?.clientHeight ?? 0;
  }

  _updateSize(): void {
    const index = this.state.activeElement;
    const size = this.state.delta + this._getElementSize(index);
    const rows = this.env.model.getters.getActiveRows();
    this.env.model.dispatch("RESIZE_COLUMNS_ROWS", {
      dimension: "ROW",
      sheetId: this.sheetId,
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
      sheetId: this.sheetId,
      sheetName: this.env.model.getters.getActiveSheetName(),
      dimension: "ROW",
      base: this.state.base,
      elements,
      position: this.state.position,
    });

    if (!result.isSuccessful) {
      if (result.reasons.includes(CommandResult.WillRemoveExistingMerge)) {
        this.env.raiseError(MergeErrorMessage);
      } else if (result.reasons.includes(CommandResult.CannotMoveTableHeader)) {
        this.env.raiseError(TableHeaderMoveErrorMessage);
      }
    }
  }

  _selectElement(index: HeaderIndex, addDistinctHeader: boolean): void {
    this.env.model.selection.selectRow(
      index,
      addDistinctHeader ? "newAnchor" : "overrideSelection"
    );
  }

  _increaseSelection(index: HeaderIndex): void {
    this.env.model.selection.selectRow(index, "updateAnchor");
  }

  _fitElementSize(index: HeaderIndex): void {
    const rows = this.env.model.getters.getActiveRows();
    this.env.model.dispatch("AUTORESIZE_ROWS", {
      sheetId: this.sheetId,
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
    const sheetId = this.sheetId;
    let row: HeaderIndex;
    for (row = index - 1; row >= 0; row--) {
      if (!this.env.model.getters.isRowHidden(sheetId, row)) {
        break;
      }
    }
    return row;
  }

  get mainUnhideHeadersProps() {
    const { top, bottom } = this.viewStore.activeMainViewport;
    const { ySplit } = this.env.model.getters.getPaneDivisions(this.sheetId);
    const hiddenGroups = this.env.model.getters.getHiddenRowsGroups(this.sheetId);
    const index = hiddenGroups.findIndex((group) => group[0] >= ySplit - 1);
    return {
      headersGroups: index === -1 ? [] : hiddenGroups.slice(index),
      offset: this.viewStore.mainViewportCoordinates.y,
      headerRange: { start: top, end: bottom },
    };
  }

  get frozenUnhideHeadersProps() {
    const { ySplit } = this.env.model.getters.getPaneDivisions(this.sheetId);
    const hiddenGroups = this.env.model.getters.getHiddenRowsGroups(this.sheetId);
    const index = hiddenGroups.findIndex((group) => group[0] >= ySplit - 1);

    return {
      headersGroups: index === -1 ? hiddenGroups : hiddenGroups.slice(0, index + 1),
      headerRange: { start: 0, end: ySplit - 1 },
    };
  }

  get frozenContainerStyle() {
    return cssPropertiesToCss({
      height: this.viewStore.mainViewportCoordinates.y + "px",
    });
  }

  get hasFrozenPane(): boolean {
    return this.env.model.getters.getPaneDivisions(this.sheetId).ySplit > 0;
  }
}

export class HeadersOverlay extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-HeadersOverlay";

  protected props = useProps(resizerPropsDefinition);
  static components = { ColResizer, RowResizer };

  selectAll() {
    this.env.model.selection.selectAll();
  }
}
