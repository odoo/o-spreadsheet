import { Ref } from "../../types";
import { useRefListener } from "./listener_hook";

const friction = 0.95;

const verticalScrollFactor = 1;
const horizontalScrollFactor = 1;

export const resetTimeoutDuration = 100;

export function useTouchScroll(
  ref: Ref<HTMLElement>,
  updateScroll: (offsetX: number, offsetY: number) => void,
  canMoveUp: () => boolean,
  canMoveDown: () => boolean
) {
  let lastX = 0;
  let lastY = 0;
  let velocityX = 0;
  let velocityY = 0;
  let isMouseDown = false;
  let lastTime = 0;
  let resetTimeout: NodeJS.Timeout | null = null;

  useRefListener(ref, "touchstart", onTouchStart, { capture: false });
  useRefListener(ref, "touchmove", onTouchMove, { capture: false });
  useRefListener(ref, "touchend", onTouchEnd, { capture: false });

  function onTouchStart(event: TouchEvent) {
    isMouseDown = true;
    ({ clientX: lastX, clientY: lastY } = event.touches[0]);
    velocityX = 0;
    velocityY = 0;
  }

  function onTouchMove(event: TouchEvent) {
    if (!isMouseDown) {
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

  function onTouchEnd(ev: MouseEvent) {
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
}
