type EventFn = (ev: PointerEvent) => void;

/**
 * Start listening to pointer events and apply the given callbacks.
 *
 * @returns A function to remove the listeners.
 */
export function startDnd(onPointerMove: EventFn, onPointerUp: EventFn) {
  const removeListeners = () => {
    window.removeEventListener("pointerup", _onPointerUp);
    window.removeEventListener("dragstart", _onDragStart);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("wheel", onPointerMove);
  };
  const _onPointerUp = (ev: PointerEvent) => {
    onPointerUp(ev);
    removeListeners();
  };
  function _onDragStart(ev: DragEvent) {
    ev.preventDefault();
  }
  window.addEventListener("pointerup", _onPointerUp);
  window.addEventListener("dragstart", _onDragStart);
  window.addEventListener("pointermove", onPointerMove);
  // mouse wheel on window is by default a passive event.
  // preventDefault() is not allowed in passive event handler.
  // https://chromestatus.com/feature/6662647093133312
  window.addEventListener("wheel", onPointerMove, { passive: false });

  return removeListeners;
}
