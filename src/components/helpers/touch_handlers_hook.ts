import { Ref } from "../../types";
import { useRefListener } from "./listener_hook";

const friction = 0.95;

const verticalScrollFactor = 1;
const horizontalScrollFactor = 1;

export const resetTimeoutDuration = 100;

export function useTouchHandlers(
  ref: Ref<HTMLElement>,
  updateScroll: (offsetX: number, offsetY: number) => void,
  canMoveUp: () => boolean,
  getZoom: () => number,
  setZoom: (scale: number) => void
) {
  // Scroll state
  let lastX = 0;
  let lastY = 0;
  let velocityX = 0;
  let velocityY = 0;
  let isMouseDown = false;
  let lastTime = 0;
  let resetTimeout: NodeJS.Timeout | null = null;
  let isZooming = false;

  // zoom state
  const evCache: PointerEvent[] = [];
  let prevDiff = -1;

  useRefListener(ref, "touchstart", onTouchStart, { capture: false });
  useRefListener(ref, "touchmove", onTouchMove, { capture: false });
  useRefListener(ref, "touchend", onTouchEnd, { capture: false });

  useRefListener(ref, "pointerdown", onPointerdown, { passive: false, capture: false });
  useRefListener(ref, "pointermove", onPointermove, { passive: false, capture: false });
  useRefListener(ref, "pointerup", onPointerUp, { passive: false, capture: false });
  useRefListener(ref, "pointercancel", onPointerUp, { passive: false });

  function onTouchStart(event: TouchEvent) {
    isMouseDown = true;
    ({ clientX: lastX, clientY: lastY } = event.touches[0]);
    velocityX = 0;
    velocityY = 0;
  }

  function onTouchMove(event: TouchEvent) {
    // const list = event.targetTouches;
    // console.log("list length", list.length);
    // if (list.length === 2) {
    //   const touch1 = list[0];
    //   const touch2 = list[1];
    //   const curDiff = computeDistance(touch1, touch2);
    //   if (event.cancelable) {
    //     event.preventDefault();
    //   }
    //   event.stopPropagation();
    //   console.log(curDiff);
    //   if (prevDiff > 0) {
    //     const ratio = (curDiff / prevDiff) ** 0.5;
    //     const zoom = Math.round(getZoom() * ratio * 100) / 100;
    //     setZoom(zoom);
    //     isZooming = true;
    //   }

    //   // Cache the distance for the next move event
    //   prevDiff = curDiff;
    // }

    // scrolling
    if (!isMouseDown || isZooming) return;

    if (resetTimeout) {
      clearTimeout(resetTimeout);
      resetTimeout = null;
    }

    const currentTime = Date.now();
    const { clientX, clientY } = event.touches[0];
    const deltaX = lastX - clientX;
    const deltaY = lastY - clientY;

    const elapsedTime = currentTime - lastTime;
    if (!elapsedTime) {
      return;
    }

    velocityX = deltaX / elapsedTime;
    velocityY = deltaY / elapsedTime;
    lastX = clientX;
    lastY = clientY;
    lastTime = currentTime;

    if (canMoveUp()) {
      if (event.cancelable) {
        event.preventDefault();
      }
      event.stopPropagation();
    }
    resetTimeout = setTimeout(() => {
      velocityX = 0;
      velocityY = 0;
    }, resetTimeoutDuration);
    updateScroll(deltaX * horizontalScrollFactor, deltaY * verticalScrollFactor);
  }

  function onTouchEnd(ev: TouchEvent) {
    isMouseDown = false;
    lastX = lastY = 0;
    if (resetTimeout) {
      clearTimeout(resetTimeout);
    }
    velocityX *= 1.2;
    velocityY *= 1.2;
    requestAnimationFrame(scroll);
  }

  function scroll() {
    if (Math.abs(velocityX) < 0.05) {
      velocityX = 0;
    }
    if (Math.abs(velocityY) < 0.05) {
      velocityY = 0;
    }
    if (!velocityX && !velocityY) {
      return;
    }
    const currentTime = Date.now();
    const elapsedTime = Math.abs(currentTime - lastTime);
    const deltaX = velocityX * elapsedTime;
    const deltaY = velocityY * elapsedTime;
    updateScroll(deltaX * horizontalScrollFactor, deltaY * verticalScrollFactor);
    lastTime = currentTime;
    velocityX *= friction;
    velocityY *= friction;
    requestAnimationFrame(scroll);
  }

  function onPointerdown(ev: PointerEvent) {
    // The pointerdown event signals the start of a touch interaction.
    // This event is cached to support 2-finger gestures
    evCache.push(ev);
    console.log(
      "evCache on pinterdown",
      evCache.map((x) => x.pointerId)
    );
    if (evCache.length < 2) {
      prevDiff = -1;
    } else if (evCache.length === 2) {
      prevDiff = computeDistance(evCache[0], evCache[1]);
    }
  }

  function onPointerUp(ev: PointerEvent) {
    // Remove this event from the target's cache
    const index = evCache.findIndex((cachedEv) => cachedEv.pointerId === ev.pointerId);
    evCache.splice(index, 1);
    console.log("evCache length", evCache.length);
    if (evCache.length < 2) {
      prevDiff = -1;
      isZooming = false;
    }
  }

  function onPointermove(ev: PointerEvent) {
    // Find this event in the cache and update its record with this event
    const index = evCache.findIndex((cachedEv) => cachedEv.pointerId === ev.pointerId);
    console.log(index);
    if (index === -1) return;

    evCache[index] = ev;
    // If two pointers are down, check for pinch gestures
    if (evCache.length === 2) {
      // Calculate the distance between the two pointers
      const curDiff = computeDistance(evCache[0], evCache[1]);

      if (prevDiff > 0) {
        // debugger;
        const ratio = (curDiff / prevDiff) ** 0.5;
        const zoom = getZoom() * ratio; //Math.round(getZoom() * ratio * 100) / 100;
        setZoom(zoom);
        isZooming = true;
        if (ev.cancelable) {
          // ev.preventDefault();
        }
      }

      // Cache the distance for the next move event
      prevDiff = curDiff;
    }
  }
}

function computeDistance(ev1: PointerEvent, ev2: PointerEvent) {
  const dx = ev1.clientX - ev2.clientX;
  const dy = ev1.clientY - ev2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}
// function computeDistance(touch1: Touch, touch2: Touch) {
//   const dx = touch1.clientX - touch2.clientX;
//   const dy = touch1.clientY - touch2.clientY;
//   return Math.sqrt(dx * dx + dy * dy);
// }
