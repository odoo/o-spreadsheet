import { Model } from "../../src";
import { MIN_DELAY, scrollDelay, toZone } from "../../src/helpers";
import { Pixel } from "../../src/types";
import { nextTick } from "./helpers";

export async function simulateClick(
  selector: string | any,
  x: number = 10,
  y: number = 10,
  extra: MouseEventInit = { bubbles: true }
) {
  let target;
  if (typeof selector === "string") {
    target = document.querySelector(selector) as HTMLElement;
    if (!target) {
      throw new Error(`"${selector}" does not match any element.`);
    }
  } else {
    target = selector;
  }
  triggerMouseEvent(selector, "mousedown", x, y, extra);
  if (target !== document.activeElement) {
    (document.activeElement as HTMLElement | null)?.blur();
    target.focus();
  }
  triggerMouseEvent(selector, "mouseup", x, y, extra);
  triggerMouseEvent(selector, "click", x, y, extra);
  await nextTick();
}

/**
 * Simulate hovering a cell for a given amount of time.
 * Don't forget to use `jest.useFakeTimers();` when using
 * this helper.
 */
export async function hoverCell(model: Model, xc: string, delay: number) {
  const zone = toZone(xc);
  let { x, y } = model.getters.getVisibleRect(zone);
  triggerMouseEvent(".o-grid-overlay", "mousemove", x, y);
  jest.advanceTimersByTime(delay);
  await nextTick();
}

export async function clickCell(
  model: Model,
  xc: string,
  extra: MouseEventInit = { bubbles: true }
) {
  const zone = toZone(xc);
  let { x, y } = model.getters.getVisibleRect(zone);
  await simulateClick(".o-grid-overlay", x, y, extra);
}

export async function gridMouseEvent(
  model: Model,
  type: string,
  xc: string,
  extra: MouseEventInit = { bubbles: true }
) {
  const zone = toZone(xc);
  let { x, y } = model.getters.getVisibleRect(zone);
  triggerMouseEvent(".o-grid-overlay", type, x, y, extra);
  await nextTick();
}

export async function rightClickCell(
  model: Model,
  xc: string,
  extra: MouseEventInit = { bubbles: true }
) {
  await gridMouseEvent(model, "contextmenu", xc, extra);
}

export function triggerMouseEvent(
  selector: string | any,
  type: string,
  x?: number,
  y?: number,
  extra: MouseEventInit = { bubbles: true }
): void {
  const ev = new MouseEvent(type, {
    clientX: x,
    clientY: y,
    bubbles: true,
    ...extra,
  });
  (ev as any).offsetX = x;
  (ev as any).offsetY = y;
  if (typeof selector === "string") {
    document.querySelector(selector)!.dispatchEvent(ev);
  } else {
    selector!.dispatchEvent(ev);
  }
}

export function setInputValueAndTrigger(
  selector: string | any,
  value: string,
  eventType: string
): void {
  let rangeInput;
  if (typeof selector === "string") {
    rangeInput = document.querySelector(selector) as HTMLInputElement;
  } else {
    rangeInput = selector;
  }
  rangeInput.value = value;
  rangeInput.dispatchEvent(new Event(eventType));
}

/** In the past, both keyDown and keyUp were awaiting two `nextTick` instead of one.
 * The reason is believed to be a hack trying to address some indeterministic errors in our tests, in vain.
 * Those indeterminisms were properly fixed afterwards which meant we could theoretically get rid of the
 * superfluous `nextTick`.
 *
 * This comment is meant to leave a trace of this change in case some issues were to arise again.
 */
export async function keyDown(key: string, options: any = {}): Promise<void> {
  document.activeElement!.dispatchEvent(
    new KeyboardEvent("keydown", Object.assign({ key, bubbles: true }, options))
  );
  return await nextTick();
}

export async function keyUp(key: string, options: any = {}): Promise<void> {
  document.activeElement!.dispatchEvent(
    new KeyboardEvent("keyup", Object.assign({ key, bubbles: true }, options))
  );
  return await nextTick();
}

export function getElComputedStyle(selector: string, style: string): string {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`No element matching selector "${selector}"`);
  return window.getComputedStyle(element)[style];
}

/**
 *
 * @param scrollDistance distance of cursor from the edge
 * @param iterations number of time to trigger the "mouseMove" callback
 * @returns number
 */
export function edgeScrollDelay(scrollDistance: Pixel, iterations: number) {
  return scrollDelay(Math.abs(Math.round(scrollDistance))) * (iterations + 1) - MIN_DELAY / 2;
}
