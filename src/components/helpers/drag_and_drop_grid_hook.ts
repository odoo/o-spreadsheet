import { HeaderIndex, Pixel } from "@odoo/o-spreadsheet-engine/types/misc";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { onWillUnmount, useEffect } from "@odoo/owl";
import { MAX_DELAY } from "../../helpers";
import { gridOverlayPosition } from "./dom_helpers";
import { startDnd } from "./drag_and_drop";
import { withZoom } from "./zoom";

export type DnDDirection = "all" | "vertical" | "horizontal";

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
  let previousEvClientPosition: { clientX: number; clientY: number };
  let startingX: number;
  let startingY: number;
  let scrollDirection: DnDDirection = "all";
  const getters = env.model.getters;

  const blockKeyboard = (ev: KeyboardEvent) => ev.preventDefault();
  const cleanUpBlockKeyboard = () =>
    removeEventListener("keydown", blockKeyboard, { capture: true });

  let cleanUpFns: (() => void)[] = [];

  const cleanUp = () => {
    clearTimeout(timeOutId);
    timeOutId = null;
    cleanUpFns.forEach((fn) => fn());
    cleanUpFns = [];
  };

  let pointerMoveCallback: (col: HeaderIndex, row: HeaderIndex, ev: PointerEvent) => void;
  let pointerUpCallback: () => void;

  const pointerMoveHandler = (ev: PointerEvent) => {
    currentEv = ev;
    if (timeOutId) {
      return;
    }

    const sheetId = getters.getActiveSheetId();
    const position = gridOverlayPosition();
    const zoomedMouseEvent = withZoom(env, currentEv, position);
    const { x: offsetCorrectionX, y: offsetCorrectionY } = getters.getMainViewportCoordinates();
    const { top, left, bottom, right } = getters.getActiveMainViewport();
    let { scrollX, scrollY } = getters.getActiveSheetScrollInfo();
    const { xSplit, ySplit } = getters.getPaneDivisions(sheetId);
    let canEdgeScroll = false;
    let timeoutDelay = MAX_DELAY;

    const x = zoomedMouseEvent.clientX - position.left;
    let colIndex = getters.getColIndex(x);

    if (scrollDirection !== "vertical") {
      const previousX = previousEvClientPosition.clientX - position.left;
      const edgeScrollInfoX = getters.getEdgeScrollCol(x, previousX, startingX);
      if (edgeScrollInfoX.canEdgeScroll) {
        canEdgeScroll = true;
        timeoutDelay = Math.min(timeoutDelay, edgeScrollInfoX.delay);
        let newTarget = colIndex;
        switch (edgeScrollInfoX.direction) {
          case "reset":
            colIndex = newTarget = xSplit;
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
        scrollX = getters.getColDimensions(sheetId, newTarget).start - offsetCorrectionX;
      }
    }

    const y = zoomedMouseEvent.clientY - position.top;
    let rowIndex = getters.getRowIndex(y);

    if (scrollDirection !== "horizontal") {
      const previousY = previousEvClientPosition.clientY - position.top;
      const edgeScrollInfoY = getters.getEdgeScrollRow(y, previousY, startingY);
      if (edgeScrollInfoY.canEdgeScroll) {
        canEdgeScroll = true;
        timeoutDelay = Math.min(timeoutDelay, edgeScrollInfoY.delay);
        let newTarget = rowIndex;
        switch (edgeScrollInfoY.direction) {
          case "reset":
            rowIndex = newTarget = ySplit;
            break;
          case 1:
            rowIndex = bottom;
            newTarget = top + 1;
            break;
          case -1:
            rowIndex = top - 1;
            while (env.model.getters.isRowHidden(sheetId, rowIndex)) {
              rowIndex--;
            }
            newTarget = rowIndex;
            break;
        }
        scrollY = env.model.getters.getRowDimensions(sheetId, newTarget).start - offsetCorrectionY;
      }
    }

    if (!canEdgeScroll) {
      colIndex = adjustIndexWithinBounds(colIndex, x, getters.getNumberCols(sheetId) - 1);
      rowIndex = adjustIndexWithinBounds(rowIndex, y, getters.getNumberRows(sheetId) - 1);
    }

    pointerMoveCallback?.(colIndex, rowIndex, currentEv);
    if (canEdgeScroll) {
      env.model.dispatch("SET_VIEWPORT_OFFSET", { offsetX: scrollX, offsetY: scrollY });
      timeOutId = setTimeout(() => {
        timeOutId = null;
        pointerMoveHandler(currentEv);
      }, Math.round(timeoutDelay));
    }
    previousEvClientPosition = {
      clientX: zoomedMouseEvent.clientX,
      clientY: zoomedMouseEvent.clientY,
    };
  };

  const pointerUpHandler = () => {
    pointerUpCallback?.();
    cleanUp();
  };

  const startFn = (
    initialPointerCoordinates: { clientX: number; clientY: number },
    onPointerMove: (col: HeaderIndex, row: HeaderIndex, ev: MouseEvent) => void,
    onPointerUp: () => void,
    startScrollDirection: DnDDirection = "all"
  ) => {
    cleanUp();
    const position = gridOverlayPosition();
    scrollDirection = startScrollDirection;
    startingX = initialPointerCoordinates.clientX - position.left;
    startingY = initialPointerCoordinates.clientY - position.top;
    previousEvClientPosition = {
      clientX: initialPointerCoordinates.clientX,
      clientY: initialPointerCoordinates.clientY,
    };
    pointerMoveCallback = onPointerMove;
    pointerUpCallback = onPointerUp;

    // block keyboard events during pointer interaction to avoid conflicts
    addEventListener("keydown", blockKeyboard, { capture: true });
    cleanUpFns.push(startDnd(pointerMoveHandler, pointerUpHandler), cleanUpBlockKeyboard);
  };

  onWillUnmount(() => {
    cleanUp();
  });

  useEffect(
    () => {
      cleanUp();
    },
    () => [getters.getActiveSheetId()]
  );

  return { start: startFn };
}

function adjustIndexWithinBounds(index: HeaderIndex, position: Pixel, max: HeaderIndex) {
  if (index === -1) {
    return position < 0 ? 0 : max;
  }
  return index;
}
