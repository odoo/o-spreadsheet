import { HEADER_HEIGHT, HEADER_WIDTH } from "../../constants";
import { SpreadsheetChildEnv } from "../../types/env";
type EventFn = (ev: MouseEvent) => void;

export function startDnd(onMouseMove: EventFn, onMouseUp: EventFn) {
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

/**
 * Function to be used during a mousedown event, this function allows to
 * perform actions related to the mousemove and mouseup events and adjusts the viewport
 * when the new position related to the mousemove event is outside of it.
 * Among inputs are two callback functions. First intended for actions performed during
 * the mousemove event, it receives as parameters the current position of the mousemove
 * (occurrence of the current column and the current row). Second intended for actions
 * performed during the mouseup event.
 */
export function dragAndDropBeyondTheViewport(
  element: HTMLElement,
  env: SpreadsheetChildEnv,
  cbMouseMove: (col: number, row: number) => void,
  cbMouseUp: () => void
) {
  const position = element.getBoundingClientRect();
  let timeOutId: any = null;
  let currentEv: MouseEvent;

  const onMouseMove = (ev: MouseEvent) => {
    currentEv = ev;
    if (timeOutId) {
      return;
    }
    const offsetX = currentEv.clientX - position.left;
    const offsetY = currentEv.clientY - position.top;
    const edgeScrollInfoX = env.model.getters.getEdgeScrollCol(offsetX - HEADER_WIDTH);
    const edgeScrollInfoY = env.model.getters.getEdgeScrollRow(offsetY - HEADER_HEIGHT);
    const { top, left, bottom, right } = env.model.getters.getActiveSnappedViewport();

    let colIndex: number;
    if (edgeScrollInfoX.canEdgeScroll) {
      colIndex = edgeScrollInfoX.direction > 0 ? right : left - 1;
    } else {
      colIndex = env.model.getters.getColIndex(offsetX - HEADER_WIDTH, left);
    }

    let rowIndex: number;
    if (edgeScrollInfoY.canEdgeScroll) {
      rowIndex = edgeScrollInfoY.direction > 0 ? bottom : top - 1;
    } else {
      rowIndex = env.model.getters.getRowIndex(offsetY - HEADER_HEIGHT, top);
    }

    cbMouseMove(colIndex, rowIndex);

    if (edgeScrollInfoX.canEdgeScroll) {
      const { left, offsetY } = env.model.getters.getActiveSnappedViewport();
      const sheetId = env.model.getters.getActiveSheetId();
      const cols = env.model.getters.getColsInfo(sheetId);

      const offsetX = cols[left + edgeScrollInfoX.direction].start;
      env.model.dispatch("SET_VIEWPORT_OFFSET", { offsetX, offsetY });
      timeOutId = setTimeout(() => {
        timeOutId = null;
        onMouseMove(currentEv);
      }, Math.round(edgeScrollInfoX.delay));
    }

    if (edgeScrollInfoY.canEdgeScroll) {
      const { top, offsetX } = env.model.getters.getActiveSnappedViewport();
      const sheetId = env.model.getters.getActiveSheetId();
      const rows = env.model.getters.getRowsInfo(sheetId);

      const offsetY = rows[top + edgeScrollInfoY.direction].start;
      env.model.dispatch("SET_VIEWPORT_OFFSET", { offsetX, offsetY });
      timeOutId = setTimeout(() => {
        timeOutId = null;
        onMouseMove(currentEv);
      }, Math.round(edgeScrollInfoX.delay));
    }
  };

  const onMouseUp = () => {
    clearTimeout(timeOutId);
    cbMouseUp();
  };

  startDnd(onMouseMove, onMouseUp);
}
