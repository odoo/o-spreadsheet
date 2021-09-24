import { TOPBAR_HEIGHT } from "../../constants";
import { MAX_DELAY } from "../../helpers";
import { SpreadsheetEnv } from "../../types/env";

type EventHandler = (ev: MouseEvent) => void;

function startDragAndDrop(onMouseMove: EventHandler, onMouseUp: EventHandler) {
  const _onMouseUp = (ev: MouseEvent) => {
    onMouseUp(ev);
    window.removeEventListener("mouseup", _onMouseUp);
    window.removeEventListener("dragstart", _onDragStart);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("wheel", onMouseMove);
  };
  function _onDragStart(ev: DragEvent) {
    ev.preventDefault();
  }

  window.addEventListener("mouseup", _onMouseUp);
  window.addEventListener("dragstart", _onDragStart);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("wheel", onMouseMove);
}

export interface DragAndDropHandlers {
  onMouseMove?: (x: number, y: number) => void;
  onMouseUp?: (ev: MouseEvent) => void;
}

/**
 * This function allows to define actions that must be executed during a mousemove
 * followed by a mouseup event. Actions are then ignored after the mouseup.
 *
 * This function is particularly useful when it is called during a mousedown event
 * to define actions to be taken when dragging and dropping elements.
 */
export function dragAndDrop(...handlers: DragAndDropHandlers[]) {
  const onMouseMove = (ev: MouseEvent) => {
    const position = spreadsheetPosition();
    const x = ev.clientX - position.left;
    const y = ev.clientY - position.top - TOPBAR_HEIGHT;
    for (let handler of handlers) {
      handler.onMouseMove?.(x, y);
    }
  };
  const onMouseUp = (ev: MouseEvent) => {
    for (let handler of handlers) {
      handler.onMouseUp?.(ev);
    }
  };
  startDragAndDrop(onMouseMove, onMouseUp);
}

export function spreadsheetPosition() {
  const spreadsheetElement = document.querySelector(".o-spreadsheet");
  if (spreadsheetElement) {
    const { top, left } = spreadsheetElement?.getBoundingClientRect();
    return { top, left };
  }
  throw new Error("Can't find spreadsheet position");
}
/**
 * Like the "dragAndDrop" function, this function allows to define actions to be
 * taken when dragging and dropping elements. It adds the possibility to update
 * the viewport position when the mousemove event tries to be executed beyond the
 * viewport.
 */
export function dragAndDropWithEdgeScrolling(
  env: SpreadsheetEnv,
  ...handlers: DragAndDropHandlers[]
) {
  let isEdgeScrolling: boolean = false;
  let timeOutId: any = null;
  let timeoutDelay: number = 0;
  let currentX: number = 0;
  let currentY: number = 0;
  const onMouseMoveWithEdgeScrolling = (x: number, y: number) => {
    currentX = x;
    currentY = y;
    if (timeOutId) {
      return;
    }
    isEdgeScrolling = false;
    timeoutDelay = 0;
    const edgeScrollInfoX = env.getters.getEdgeScrollCol(x);
    const edgeScrollInfoY = env.getters.getEdgeScrollRow(y);
    isEdgeScrolling = edgeScrollInfoX.canEdgeScroll || edgeScrollInfoY.canEdgeScroll;
    timeoutDelay = Math.min(
      edgeScrollInfoX.canEdgeScroll ? edgeScrollInfoX.delay : MAX_DELAY,
      edgeScrollInfoY.canEdgeScroll ? edgeScrollInfoY.delay : MAX_DELAY
    );

    for (let handler of handlers) {
      handler.onMouseMove?.(x, y);
    }

    if (isEdgeScrolling) {
      const { top, left } = env.getters.getActiveSnappedViewport();
      const { cols, rows } = env.getters.getActiveSheet();
      const offsetX = cols[left + edgeScrollInfoX.direction].start;
      const offsetY = rows[top + edgeScrollInfoY.direction].start;
      env.dispatch("SET_VIEWPORT_OFFSET", { offsetX, offsetY });
      timeOutId = setTimeout(() => {
        timeOutId = null;
        onMouseMoveWithEdgeScrolling(currentX, currentY);
      }, Math.round(timeoutDelay));
    }
  };

  const onMouseUpWithEdgeScrolling = (ev: MouseEvent) => {
    clearTimeout(timeOutId);
    for (let dndHandler of handlers) {
      dndHandler.onMouseUp?.(ev);
    }
  };

  dragAndDrop({
    onMouseMove: onMouseMoveWithEdgeScrolling,
    onMouseUp: onMouseUpWithEdgeScrolling,
  });
}

export function dragAndDropCellHandler(
  env: SpreadsheetEnv,
  onCellChange: (colIndex: number, rowIndex: number) => void,
  onMouseUp: EventHandler
): DragAndDropHandlers {
  let prevCol: undefined | number = undefined;
  let prevRow: undefined | number = undefined;

  const onMouseMove = (offsetX, offsetY) => {
    const { left, top } = env.getters.getActiveSnappedViewport();

    let colIndex = env.getters.getColIndex(offsetX, left);
    let rowIndex = env.getters.getRowIndex(offsetY, top);

    // special case when using onMouseMove for the first time
    if (prevRow === undefined || prevCol === undefined) {
      prevCol = colIndex;
      prevRow = rowIndex;

      onCellChange(colIndex, rowIndex);
      return;
    }

    // other cases
    colIndex = colIndex === -1 ? prevCol : colIndex;
    rowIndex = rowIndex === -1 ? prevRow : rowIndex;
    if (colIndex !== prevCol || rowIndex !== prevRow) {
      prevCol = colIndex;
      prevRow = rowIndex;
      onCellChange(colIndex, rowIndex);
    }
  };
  return { onMouseMove, onMouseUp };
}
