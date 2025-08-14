import { DEFAULT_CELL_HEIGHT } from "../../constants";
import { isMacOS } from "./dom_helpers";

export function useWheelHandler(handler: (deltaX: number, deltaY: number) => void) {
  function normalize(val: number, deltaMode: number): number {
    return val * (deltaMode === 0 ? 1 : DEFAULT_CELL_HEIGHT);
  }
  const onMouseWheel = (ev: WheelEvent) => {
    const deltaX = normalize(ev.shiftKey && !isMacOS() ? ev.deltaY : ev.deltaX, ev.deltaMode);
    const deltaY = normalize(ev.shiftKey && !isMacOS() ? ev.deltaX : ev.deltaY, ev.deltaMode);
    handler(deltaX, deltaY);
  };
  return onMouseWheel;
}
