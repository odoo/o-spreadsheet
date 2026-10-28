import { isMobileOS } from "../components/helpers/dom_helpers";
import { DisposableStore } from "../store_engine/store";
import { Get } from "../types/store_engine";

/**
 * Last pointer position on the page. It outlives the components, so that a component mounted
 * under a motionless pointer (e.g. a figure scrolled back into view) knows what is hovered.
 */
export class PointerPositionStore extends DisposableStore {
  lastPointerEvent: PointerEvent | undefined = undefined;

  constructor(get: Get) {
    super(get);
    const onPointerMove = (ev: PointerEvent) => {
      if (!isMobileOS()) {
        this.lastPointerEvent = ev;
      }
    };
    const onPointerOut = (ev: PointerEvent) => {
      // the pointer left the page
      if (!ev.relatedTarget) {
        this.lastPointerEvent = undefined;
      }
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerout", onPointerOut);
    this.onDispose(() => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerout", onPointerOut);
    });
  }
}
