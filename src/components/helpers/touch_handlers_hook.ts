import { Ref } from "../../types";
import { useRefListener } from "./listener_hook";

const friction = 0.95;

const verticalScrollFactor = 1;
const horizontalScrollFactor = 1;

export const resetTimeoutDuration = 100;

type touchCallBacks = {
  updateScroll: (offsetX: number, offsetY: number) => void;
  canMoveUp: () => boolean;
  canMoveDown: () => boolean;
  getZoom: () => number;
  setZoom: (scale: number) => void;
};

export function useTouchHandlers(
  ref: Ref<HTMLElement>,
  { updateScroll, canMoveUp, canMoveDown, getZoom, setZoom }: touchCallBacks
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
  let previousPointersDistance = -1;

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
    // scrolling
    // FIXME: should we allow scrolling when zooming with 2 fingers on Android (works on iOS)
    if (!isMouseDown || isZooming) {
      if (event.cancelable) {
        event.preventDefault();
      }
      event.stopPropagation();
      return;
    }

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

    if ((deltaY < 0 && canMoveUp()) || (deltaY > 0 && canMoveDown())) {
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
    if (evCache.length < 2) {
      previousPointersDistance = -Infinity;
    } else if (evCache.length === 2) {
      previousPointersDistance = computeDistance(evCache[0], evCache[1]);
    }
  }

  function onPointerUp(ev: PointerEvent) {
    const index = evCache.findIndex((cachedEv) => cachedEv.pointerId === ev.pointerId);
    evCache.splice(index, 1);
    if (evCache.length < 2) {
      previousPointersDistance = -Infinity;
      isZooming = false;
    }
  }

  function onPointermove(ev: PointerEvent) {
    const index = evCache.findIndex((cachedEv) => cachedEv.pointerId === ev.pointerId);
    if (index === -1) {
      return;
    }
    evCache[index] = ev;

    if (evCache.length === 2) {
      const currentDistance = computeDistance(evCache[0], evCache[1]);

      // only start zooming if the distance between the two pointers has changed significantly
      if (!isZooming && Math.abs(currentDistance - previousPointersDistance) >= 30) {
        isZooming = true;
        previousPointersDistance = currentDistance;
      }

      if (isZooming) {
        const ratio = (currentDistance / previousPointersDistance) ** 0.5;
        // Rounding up to avoid floating point precision issues
        const zoom = Math.round(getZoom() * ratio * 1000) / 1000;
        setZoom(zoom);
        previousPointersDistance = currentDistance;
      }
    }
  }
}

function computeDistance(ev1: PointerEvent, ev2: PointerEvent) {
  const dx = ev1.clientX - ev2.clientX;
  const dy = ev1.clientY - ev2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}
