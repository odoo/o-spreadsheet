import { Component } from "@odoo/owl";
import { SpreadsheetEnv } from "../../types/env";
import { gridCanvasPosition } from "./position_hook";
type EventFn = (ev: MouseEvent) => void;

export function startDnd(onMouseMove: EventFn, onMouseUp: EventFn) {
  const _onMouseUp = (ev: MouseEvent) => {
    onMouseUp(ev);
    window.removeEventListener("mouseup", _onMouseUp);
    window.removeEventListener("dragstart", _onDragStart);
    // window.removeEventListener("drag", _onDragStart);
    window.removeEventListener("mousemove", onMouseMove);
  };
  function _onDragStart(ev: DragEvent) {
    ev.preventDefault();
  }

  window.addEventListener("mouseup", _onMouseUp);
  window.addEventListener("dragstart", _onDragStart);
  // window.addEventListener("drag", _onDragStart);
  window.addEventListener("mousemove", onMouseMove);
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
  comp: Component,
  element: HTMLElement,
  env: SpreadsheetEnv,
  cbMouseMove: (col: number, row: number) => void,
  cbMouseUp: () => void
) {
  let timeOutId: any = null;
  let currentEv: MouseEvent;

  const onMouseMove = (ev: MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    currentEv = ev;
    if (timeOutId) {
      return;
    }
    const position = gridCanvasPosition();

    const offsetX = currentEv.clientX - position.left;
    const offsetY = currentEv.clientY - position.top;
    const edgeScrollInfoX = env.getters.getEdgeScrollCol(offsetX);
    const edgeScrollInfoY = env.getters.getEdgeScrollRow(offsetY);
    const {
      top,
      left,
      bottom,
      right,
      offsetX: viewportOffsetX,
      offsetY: viewportOffsetY,
    } = env.getters.getActiveViewport();

    let colIndex: number;
    if (edgeScrollInfoX.canEdgeScroll) {
      colIndex = edgeScrollInfoX.direction > 0 ? right : left - 1;
    } else {
      colIndex = env.getters.getColIndex(offsetX, viewportOffsetX);
    }

    let rowIndex: number;
    if (edgeScrollInfoY.canEdgeScroll) {
      rowIndex = edgeScrollInfoY.direction > 0 ? bottom : top - 1;
    } else {
      rowIndex = env.getters.getRowIndex(offsetY, viewportOffsetY);
    }

    // console.log("drag & drop", colIndex, rowIndex);
    cbMouseMove(colIndex, rowIndex);

    // TODO: mettre les conditions ensemble, c'est du code dupliqué et ça trigger 2 rendus au lieu d'un seul
    if (edgeScrollInfoX.canEdgeScroll) {
      const { left, offsetY } = env.getters.getActiveViewport();
      const { cols } = env.getters.getActiveSheet();
      const offsetX = cols[left + edgeScrollInfoX.direction].start;
      comp.trigger("tabouret", { offsetX, offsetY });
      timeOutId = setTimeout(() => {
        timeOutId = null;
        onMouseMove(currentEv);
      }, Math.round(edgeScrollInfoX.delay));
    }

    if (edgeScrollInfoY.canEdgeScroll) {
      const { top, offsetX } = env.getters.getActiveViewport();
      const { rows } = env.getters.getActiveSheet();
      const offsetY = rows[top + edgeScrollInfoY.direction].start;
      comp.trigger("tabouret", { offsetX, offsetY });
      timeOutId = setTimeout(() => {
        timeOutId = null;
        onMouseMove(currentEv);
      }, Math.round(edgeScrollInfoY.delay));
    }
  };

  const onMouseUp = () => {
    clearTimeout(timeOutId);
    cbMouseUp();
  };

  startDnd(onMouseMove, onMouseUp);
}
