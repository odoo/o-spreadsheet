import { onWillUnmount } from "@odoo/owl";
import { MAX_DELAY } from "../../helpers";
import { SpreadsheetChildEnv } from "../../types/env";
import { HeaderIndex, Pixel } from "../../types/misc";
import { gridOverlayPosition } from "./dom_helpers";
type EventFn = (ev: MouseEvent) => void;

/**
 * Start listening to pointer events and apply the given callbacks.
 *
 * @returns A function to remove the listeners.
 */
export function startDnd(onMouseMove: EventFn, onMouseUp: EventFn) {
  const removeListeners = () => {
    window.removeEventListener("pointerup", _onMouseUp);
    window.removeEventListener("dragstart", _onDragStart);
    window.removeEventListener("pointermove", onMouseMove);
    window.removeEventListener("wheel", onMouseMove);
  };
  const _onMouseUp = (ev: MouseEvent) => {
    onMouseUp(ev);
    removeListeners();
  };
  function _onDragStart(ev: DragEvent) {
    ev.preventDefault();
  }
  window.addEventListener("pointerup", _onMouseUp);
  window.addEventListener("dragstart", _onDragStart);
  window.addEventListener("pointermove", onMouseMove);
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
export function useDragAndDropBeyondTheViewport(
  env: SpreadsheetChildEnv,
  only: "horizontal" | "vertical" | false = false
) {
  let timeOutId: any = null;
  let currentEv: MouseEvent;
  let previousEvPosition: { clientX: number; clientY: number };
  let startingX: number;
  let startingY: number;
  const getters = env.model.getters;
  const sheetId = getters.getActiveSheetId();
  let position = { top: 0, left: 0 };
  let colIndex: number;
  let rowIndex: number;
  let stop: () => void;

  let cbMouseMove = (col: HeaderIndex, row: HeaderIndex, ev: MouseEvent) => {};
  let cbMouseUp = () => {};

  const onMouseMove = (ev: MouseEvent) => {
    currentEv = ev;
    if (timeOutId) {
      return;
    }

    const { x: offsetCorrectionX, y: offsetCorrectionY } = getters.getMainViewportCoordinates();
    let { top, left, bottom, right } = getters.getActiveMainViewport();
    let { scrollX, scrollY } = getters.getActiveSheetScrollInfo();
    const { xSplit, ySplit } = getters.getPaneDivisions(sheetId);
    let canEdgeScroll = false;
    let timeoutDelay = MAX_DELAY;

    const x = currentEv.clientX - position.left;
    colIndex = getters.getColIndex(x);

    if (only !== "vertical") {
      const previousX = previousEvPosition.clientX - position.left;
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

    const y = currentEv.clientY - position.top;
    rowIndex = getters.getRowIndex(y);

    if (only !== "horizontal") {
      const previousY = previousEvPosition.clientY - position.top;
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
    previousEvPosition = { clientX: currentEv.clientX, clientY: currentEv.clientY };
  };

  const onMouseUp = () => {
    clearTimeout(timeOutId);
    cbMouseUp();
  };

  // start should have the callbacks as well
  const start = (
    dndStartClientX: Pixel,
    dndStartClientY: Pixel,
    cbMouseMove: (col: HeaderIndex, row: HeaderIndex, ev: MouseEvent) => void,
    cbMouseUp: () => void
  ) => {
    startingX = dndStartClientX - position.left;
    startingY = dndStartClientY - position.top;
    previousEvPosition = { clientX: dndStartClientX, clientY: dndStartClientY };
    position = gridOverlayPosition();
    cbMouseMove = cbMouseMove;
    cbMouseUp = cbMouseUp;
    stop = startDnd(onMouseMove, onMouseUp);
  };

  onWillUnmount(() => {
    stop();
  });

  return { start };
}
