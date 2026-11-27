import { onWillUnmount, useExternalListener } from "@odoo/owl";
import { Ref } from "../../types";
import { useRefListener } from "./listener_hook";

export const LONG_PRESS_DURATION = 500;
export const LONG_PRESS_MOVE_TOLERANCE = 10;

export function useLongPressHook(ref: Ref<HTMLElement>) {
  let longPressTimeout: NodeJS.Timeout | undefined;
  let hasOpenedContextMenu = false;
  let startX = 0;
  let startY = 0;

  useRefListener(ref, "touchstart", onTouchStart, { capture: false });
  useRefListener(ref, "touchmove", onTouchMove, { capture: false });
  useRefListener(ref, "touchcancel", onTouchEnd, { capture: false });
  useRefListener(ref, "touchend", onTouchEnd, { capture: false });
  useExternalListener(window, "contextmenu", onContextMenu, { capture: true });
  onWillUnmount(cancelLongPress);

  function onTouchStart(event: TouchEvent) {
    startLongPress(event);
  }

  function onTouchMove(event: TouchEvent) {
    const { clientX, clientY } = event.touches[0];
    if (
      event.touches.length !== 1 ||
      Math.abs(clientX - startX) > LONG_PRESS_MOVE_TOLERANCE ||
      Math.abs(clientY - startY) > LONG_PRESS_MOVE_TOLERANCE
    ) {
      cancelLongPress();
    }
  }

  function onTouchEnd(event: TouchEvent) {
    cancelLongPress();
    if (hasOpenedContextMenu && event.cancelable) {
      event.preventDefault();
    }
    hasOpenedContextMenu = false;
  }

  function startLongPress(event: TouchEvent) {
    cancelLongPress();
    hasOpenedContextMenu = false;
    const target = event.target;
    if (event.touches.length !== 1 || !target) {
      return;
    }
    const { clientX, clientY } = event.touches[0];
    startX = clientX;
    startY = clientY;
    longPressTimeout = setTimeout(() => {
      longPressTimeout = undefined;
      const options = { bubbles: true, cancelable: true, clientX, clientY, button: 2 };
      hasOpenedContextMenu = !target.dispatchEvent(new MouseEvent("contextmenu", options));
    }, LONG_PRESS_DURATION);
  }

  function cancelLongPress() {
    clearTimeout(longPressTimeout);
    longPressTimeout = undefined;
  }

  function onContextMenu(event: TouchEvent) {
    if (hasOpenedContextMenu) {
      event.preventDefault();
      event.stopImmediatePropagation();
    } else if (longPressTimeout) {
      cancelLongPress();
      hasOpenedContextMenu = true;
    }
  }
}
