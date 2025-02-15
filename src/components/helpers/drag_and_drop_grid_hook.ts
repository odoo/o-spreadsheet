import { onWillUnmount } from "@odoo/owl";
import { MAX_DELAY } from "../../helpers";
import { SpreadsheetChildEnv } from "../../types/env";
import { HeaderIndex } from "../../types/misc";
import { gridOverlayPosition } from "./dom_helpers";
import { startDnd } from "./drag_and_drop";

/**
 * Function to be used during a pointerdown event, this function allows to
 * perform actions related to the pointermove and pointerup events and adjusts the viewport
 * when the new position related to the pointermove event is outside of it.
 * Among inputs are two callback functions. First intended for actions performed during
 * the pointermove event, it receives as parameters the current position of the pointermove
 * (occurrence of the current column and the current row). Second intended for actions
 * performed during the pointerup event.
 */
export function useDragAndDropBeyondTheViewport(env: SpreadsheetChildEnv) {
  let timeOutId: any = null;
  let currentEv: PointerEvent;
  // uniformiser les objets qu'ohn manipule, soit object soit variable X et Y
  let previousEvClientPosition: { clientX: number; clientY: number };
  let startingX: number;
  let startingY: number;
  const getters = env.model.getters;
  const sheetId = getters.getActiveSheetId();
  let cleanUp: () => void;

  let pointerMoveCallback: (col: HeaderIndex, row: HeaderIndex, ev: PointerEvent) => void;
  let pointerUpCallback: () => void;

  const pointerMoveHandler = (ev: PointerEvent) => {
    currentEv = ev;
    if (timeOutId) {
      return;
    }

    const position = gridOverlayPosition();

    const { x: offsetCorrectionX, y: offsetCorrectionY } = getters.getMainViewportCoordinates();
    let { top, left, bottom, right } = getters.getActiveMainViewport();
    let { scrollX, scrollY } = getters.getActiveSheetScrollInfo();
    const { xSplit, ySplit } = getters.getPaneDivisions(sheetId);
    let canEdgeScroll = false;
    let timeoutDelay = MAX_DELAY;

    const x = currentEv.clientX - position.left;
    let colIndex = getters.getColIndex(x);

    const previousX = previousEvClientPosition.clientX - position.left;
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

    const y = currentEv.clientY - position.top;
    let rowIndex = getters.getRowIndex(y);

    const previousY = previousEvClientPosition.clientY - position.top;
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

    if (!canEdgeScroll) {
      if (rowIndex === -1) {
        rowIndex = y < 0 ? 0 : getters.getNumberRows(sheetId) - 1;
      }
      if (colIndex === -1 && x < 0) {
        colIndex = x < 0 ? 0 : getters.getNumberCols(sheetId) - 1;
      }
    }

    pointerMoveCallback?.(colIndex, rowIndex, currentEv);
    if (canEdgeScroll) {
      env.model.dispatch("SET_VIEWPORT_OFFSET", { offsetX: scrollX, offsetY: scrollY });
      timeOutId = setTimeout(() => {
        timeOutId = null;
        pointerMoveHandler(currentEv);
      }, Math.round(timeoutDelay));
    }
    previousEvClientPosition = { clientX: currentEv.clientX, clientY: currentEv.clientY };
  };

  const pointerUpHandler = () => {
    clearTimeout(timeOutId);
    timeOutId = null;
    pointerUpCallback?.();
  };

  const startFn = (
    ev: PointerEvent,
    onPointerMove: (col: HeaderIndex, row: HeaderIndex, ev: MouseEvent) => void,
    onPointerUp: () => void
  ) => {
    const position = gridOverlayPosition();
    startingX = ev.clientX - position.left;
    startingY = ev.clientY - position.top;
    previousEvClientPosition = { clientX: ev.clientX, clientY: ev.clientY };
    pointerMoveCallback = onPointerMove;
    pointerUpCallback = onPointerUp;
    cleanUp = startDnd(pointerMoveHandler, pointerUpHandler);
  };

  onWillUnmount(() => {
    clearTimeout(timeOutId);
    timeOutId = null;
    cleanUp?.();
  });

  return { start: startFn };
}
