import { Ref } from "@odoo/o-spreadsheet-engine";
import { useRefListener } from "./listener_hook";

const evCache: PointerEvent[] = [];
let prevDiff = -1;

/** Largely inspired by the pinch-to-zoom example provided at MDN
 * https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Pinch_zoom_gestures#example
 * on the 30th of October 2025
 */
export function usePinchToZoom(ref: Ref<HTMLElement>, onZoom: (scale: number) => void) {
  useRefListener(ref, "pointerdown", pointerdownHandler, { passive: false });
  useRefListener(ref, "pointermove", pointermoveHandler, { passive: false });
  useRefListener(ref, "pointerup", pointerupHandler, { passive: false });
  useRefListener(ref, "pointercancel", pointerupHandler, { passive: false });

  function pointerupHandler(ev: PointerEvent) {
    // Remove this event from the target's cache
    const index = evCache.findIndex((cachedEv) => cachedEv.pointerId === ev.pointerId);
    evCache.splice(index, 1);
    if (evCache.length < 2) {
      prevDiff = -1;
    }
  }

  function pointerdownHandler(ev: PointerEvent) {
    // The pointerdown event signals the start of a touch interaction.
    // This event is cached to support 2-finger gestures
    evCache.push(ev);
  }

  function pointermoveHandler(ev: PointerEvent) {
    // Find this event in the cache and update its record with this event
    const index = evCache.findIndex((cachedEv) => cachedEv.pointerId === ev.pointerId);
    evCache[index] = ev;

    // If two pointers are down, check for pinch gestures
    if (evCache.length === 2) {
      // Calculate the distance between the two pointers
      const dx = evCache[0].clientX - evCache[1].clientX;
      const dy = evCache[0].clientY - evCache[1].clientY;

      const curDiff = Math.abs(dx * dx + dy * dy);

      if (prevDiff > 0) {
        onZoom((curDiff / prevDiff) ** 0.25);
      }

      // Cache the distance for the next move event
      prevDiff = curDiff;
    }
  }
}
