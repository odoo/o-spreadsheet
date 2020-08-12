type EventFn = (ev: MouseEvent) => void;

export function startDnd(onMouseMove: EventFn, onMouseUp: EventFn) {
  const _onMouseUp = (ev: MouseEvent) => {
    onMouseUp(ev);
    window.removeEventListener("mouseup", _onMouseUp);
    window.removeEventListener("dragstart", _onDragStart);
    window.removeEventListener("mousemove", onMouseMove);
  };
  function _onDragStart(ev: DragEvent) {
    ev.preventDefault();
  }

  window.addEventListener("mouseup", _onMouseUp);
  window.addEventListener("dragstart", _onDragStart);
  window.addEventListener("mousemove", onMouseMove);
}
