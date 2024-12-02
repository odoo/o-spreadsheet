import { MAX_DELAY } from "../../helpers";
import { SpreadsheetChildEnv } from "../../types/env";
import { HeaderIndex } from "../../types/misc";
import { gridOverlayPosition } from "./dom_helpers";
type EventFn = (ev: TouchEvent) => void;

/**
 * Start listening to pointer events and apply the given callbacks.
 *
 * @returns A function to remove the listeners.
 */
export function startDndTouch(
  onMouseMove: EventFn,
  onMouseUp: EventFn,
  onMouseDown: EventFn = () => {}
) {
  const removeListeners = () => {
    window.removeEventListener("touchstart", onMouseDown);
    window.removeEventListener("touchend", _onMouseUp);
    window.removeEventListener("dragstart", _onDragStart);
    window.removeEventListener("touchmove", onMouseMove);
    window.removeEventListener("wheel", onMouseMove);
  };
  const _onMouseUp = (ev: TouchEvent) => {
    onMouseUp(ev);
    removeListeners();
  };
  function _onDragStart(ev: DragEvent) {
    ev.preventDefault();
  }
  window.addEventListener("touchstart", onMouseDown);
  window.addEventListener("touchend", _onMouseUp);
  window.addEventListener("dragstart", _onDragStart);
  window.addEventListener("touchmove", onMouseMove);
  // mouse wheel on window is by default a passive event.
  // preventDefault() is not allowed in passive event handler.
  // https://chromestatus.com/feature/6662647093133312
  window.addEventListener("wheel", onMouseMove, { passive: false });

  return removeListeners;
}

/**
 * Function to be used during a pointerdown event, this function allows to
 * perform actions related to the pointermove and pointerup events and adjusts the viewport
 * when the new position related to the pointermove event is outside of it.
 * Among inputs are two callback functions. First intended for actions performed during
 * the pointermove event, it receives as parameters the current position of the pointermove
 * (occurrence of the current column and the current row). Second intended for actions
 * performed during the pointerup event.
 */
export function dragAndDropBeyondTheViewportTouch(
  env: SpreadsheetChildEnv,
  cbMouseMove: (col: HeaderIndex, row: HeaderIndex, ev: TouchEvent) => void,
  cbMouseUp: () => void,
  only: "horizontal" | "vertical" | false = false
) {
  let timeOutId: any = null;
  let currentEv: TouchEvent;
  let previousEv: TouchEvent;
  let startingEv: TouchEvent;
  let startingX: number;
  let startingY: number;
  const getters = env.model.getters;
  const sheetId = getters.getActiveSheetId();
  const position = gridOverlayPosition();
  let colIndex: number;
  let rowIndex: number;
  const onMouseDown = (ev: TouchEvent) => {
    previousEv = ev;
    startingEv = ev;
    startingX = startingEv.touches[0].clientX - position.left;
    startingY = startingEv.touches[0].clientY - position.top;
  };
  const onMouseMove = (ev: TouchEvent) => {
    currentEv = ev;
    if (timeOutId) {
      return;
    }

    const { x: offsetCorrectionX, y: offsetCorrectionY } = getters.getMainViewportCoordinates();
    let { top, left, bottom, right } = getters.getActiveMainViewport();
    let { scrollX, scrollY } = getters.getActiveSheetDOMScrollInfo();
    const { xSplit, ySplit } = getters.getPaneDivisions(sheetId);
    let canEdgeScroll = false;
    let timeoutDelay = MAX_DELAY;

    const x = currentEv.touches[0].clientX - position.left;
    colIndex = getters.getColIndex(x);

    if (only !== "vertical") {
      const previousX = previousEv.touches[0].clientX - position.left;
      const edgeScrollInfoX = getters.getEdgeScrollCol(x, previousX, startingX);
      if (edgeScrollInfoX.canEdgeScroll) {
        canEdgeScroll = true;
        timeoutDelay = Math.min(timeoutDelay, edgeScrollInfoX.delay);
        let newTarget: number;
        switch (edgeScrollInfoX.direction) {
          case "reset":
            colIndex = xSplit;
            newTarget = xSplit;
            break;
          case 1:
            colIndex = right;
            newTarget = left + 1;
            break;
          case -1:
            colIndex = left - 1;
            while (env.model.getters.isColHidden(sheetId, colIndex)) {
              colIndex--;
            }
            newTarget = colIndex;
            break;
        }
        scrollX = getters.getColDimensions(sheetId, newTarget!).start - offsetCorrectionX;
      }
    }

    const y = currentEv.touches[0].clientY - position.top;
    rowIndex = getters.getRowIndex(y);

    if (only !== "horizontal") {
      const previousY = previousEv.touches[0].clientY - position.top;
      const edgeScrollInfoY = getters.getEdgeScrollRow(y, previousY, startingY);
      if (edgeScrollInfoY.canEdgeScroll) {
        canEdgeScroll = true;
        timeoutDelay = Math.min(timeoutDelay, edgeScrollInfoY.delay);
        let newTarget: number;
        switch (edgeScrollInfoY.direction) {
          case "reset":
            rowIndex = ySplit;
            newTarget = ySplit;
            break;
          case 1:
            rowIndex = bottom;
            newTarget = top + edgeScrollInfoY.direction;
            break;
          case -1:
            rowIndex = top - 1;
            while (env.model.getters.isRowHidden(sheetId, rowIndex)) {
              rowIndex--;
            }
            newTarget = rowIndex;
            break;
        }
        scrollY = env.model.getters.getRowDimensions(sheetId, newTarget!).start - offsetCorrectionY;
      }
    }

    if (!canEdgeScroll) {
      if (rowIndex === -1) {
        rowIndex = y < 0 ? 0 : getters.getNumberRows(sheetId) - 1;
      }
      if (colIndex === -1 && x < 0) {
        colIndex = x < 0 ? 0 : getters.getNumberCols(sheetId) - 1;
      }
    }

    cbMouseMove(colIndex, rowIndex, currentEv);
    if (canEdgeScroll) {
      env.model.dispatch("SET_VIEWPORT_OFFSET", { offsetX: scrollX, offsetY: scrollY });
      timeOutId = setTimeout(() => {
        timeOutId = null;
        onMouseMove(currentEv);
      }, Math.round(timeoutDelay));
    }
    previousEv = currentEv;
  };

  const onMouseUp = () => {
    clearTimeout(timeOutId);
    cbMouseUp();
  };

  startDndTouch(onMouseMove, onMouseUp, onMouseDown);
}
