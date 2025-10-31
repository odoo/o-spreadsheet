import { Ref } from "@odoo/o-spreadsheet-engine";
import { useRefListener } from "./listener_hook";

/** Largely inspired by the pinch-to-zoom example provided at MDN
 * https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Pinch_zoom_gestures#example
 * on the 30th of October 2025
 */
export function usePinchToZoom(
  ref: Ref<HTMLElement>,
  getZoom: () => number,
  setZoom: (scale: number) => void
) {
  const evCache: PointerEvent[] = [];
  let prevDiff = -1;

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
    if (evCache.length < 2) {
      prevDiff = -1;
    } else if (evCache.length === 2) {
      prevDiff = computeDistance(evCache[0], evCache[1]);
    }
  }

  function computeDistance(ev1: PointerEvent, ev2: PointerEvent) {
    const dx = ev1.clientX - ev2.clientX;
    const dy = ev1.clientY - ev2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function pointermoveHandler(ev: PointerEvent) {
    // Find this event in the cache and update its record with this event
    const index = evCache.findIndex((cachedEv) => cachedEv.pointerId === ev.pointerId);
    if (index === -1) return;

    evCache[index] = ev;

    // If two pointers are down, check for pinch gestures
    if (evCache.length === 2) {
      // Calculate the distance between the two pointers
      const curDiff = computeDistance(evCache[0], evCache[1]);

      if (prevDiff > 0) {
        const ratio = (curDiff / prevDiff) ** 0.5;
        const zoom = Math.round(getZoom() * ratio * 100) / 100;
        setZoom(zoom);
      }

      // Cache the distance for the next move event
      prevDiff = curDiff;
    }
  }
}
