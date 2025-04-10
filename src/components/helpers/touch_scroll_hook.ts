import { Ref } from "../../types";
import { useRefListener } from "./listener_hook";

const friction = 0.95;

const verticalScrollFactor = 1;

const HorizontalScrollFactor = 1;

// TODO merge it with the stop scroll of lucas

export function useTouchScroll(
  ref: Ref<HTMLElement>,

  updateScroll: (offsetX: number, offsetY: number) => void,

  canMoveUp: () => boolean
) {
  let lastX = 0;
  let lastY = 0;
  let velocityX = 0;
  let velocityY = 0;
  let isMouseDown = false;
  let lastTime = 0;

  useRefListener(ref, "touchstart", onTouchStart, { capture: false });
  useRefListener(ref, "touchmove", onTouchMove, { capture: false });
  useRefListener(ref, "touchend", onTouchEnd, { capture: false });

  function clientValue(ev: MouseEvent | TouchEvent) {
    const clientX = ev instanceof MouseEvent ? ev.clientX : ev.touches[0].clientX;
    const clientY = ev instanceof MouseEvent ? ev.clientY : ev.touches[0].clientY;
    return { clientX, clientY };
  }

  function onTouchStart(event: TouchEvent) {
    isMouseDown = true;
    ({ clientX: lastX, clientY: lastY } = clientValue(event));
    velocityX = 0;
    velocityY = 0;
  }

  function onTouchMove(event: TouchEvent) {
    if (!isMouseDown) return;

    const currentTime = Date.now();
    const { clientX, clientY } = clientValue(event);
    let deltaX = lastX - clientX;
    let deltaY = lastY - clientY;

    const elapsedTime = currentTime - lastTime;
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

    updateScroll(deltaX * HorizontalScrollFactor, deltaY * verticalScrollFactor);
  }

  function onTouchEnd(ev: MouseEvent) {
    isMouseDown = false;
    lastX = lastY = 0;
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
    updateScroll(deltaX * HorizontalScrollFactor, deltaY * verticalScrollFactor);
    lastTime = currentTime;
    velocityX *= friction;
    velocityY *= friction;
    requestAnimationFrame(scroll);
  }
}
