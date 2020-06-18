type EventFn = (ev: MouseEvent) => void;

export function startDnd(onMouseMove: EventFn, onMouseUp: EventFn) {
  const _onMouseUp = (ev: MouseEvent) => {
    onMouseUp(ev);
    window.removeEventListener("mousemove", onMouseMove);
  };
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", _onMouseUp, { once: true });
}
