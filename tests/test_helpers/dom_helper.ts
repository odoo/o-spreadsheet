import { Model } from "../../src";
import { HEADER_HEIGHT, HEADER_WIDTH } from "../../src/constants";
import { toZone } from "../../src/helpers";
import {
  getColEndPosition,
  getColStartPosition,
  getRowEndPosition,
  getRowStartPosition,
} from "./getters_helpers";
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
  const viewport = model.getters.getActiveViewport();
  let { x, y } = model.getters.getRect(zone, viewport);
  if (!model.getters.isDashboard()) {
    x -= HEADER_WIDTH;
    y -= HEADER_HEIGHT;
  }
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
  const viewport = model.getters.getActiveViewport();
  let { x, y } = model.getters.getRect(zone, viewport);
  if (model.getters.isDashboard()) {
    x += HEADER_WIDTH;
    y += HEADER_HEIGHT;
  }
  await simulateClick(".o-grid-overlay", x - HEADER_WIDTH, y - HEADER_HEIGHT, extra);
}

export async function gridMouseEvent(
  model: Model,
  type: string,
  xc: string,
  extra: MouseEventInit = { bubbles: true }
) {
  const zone = toZone(xc);
  const viewport = model.getters.getActiveViewport();
  let { x, y } = model.getters.getRect(zone, viewport);
  if (!model.getters.isDashboard()) {
    x -= HEADER_WIDTH;
    y -= HEADER_HEIGHT;
  }
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
  (ev as any).pageX = x;
  (ev as any).pageY = y;
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

export async function mousedownNWCellCorner(model: Model, el: Element, xc: string) {
  const { top, left } = toZone(xc);
  triggerMouseEvent(
    el,
    "mousedown",
    getColStartPosition(model, left),
    getRowStartPosition(model, top)
  );
  await nextTick();
}

export async function mousedownNECellCorner(model: Model, el: Element, xc: string) {
  const { top, left } = toZone(xc);
  triggerMouseEvent(
    el,
    "mousedown",
    getColEndPosition(model, left),
    getRowStartPosition(model, top)
  );
  await nextTick();
}

export async function mousedownSWCellCorner(model: Model, el: Element, xc: string) {
  const { top, left } = toZone(xc);
  triggerMouseEvent(
    el,
    "mousedown",
    getColStartPosition(model, left),
    getRowEndPosition(model, top)
  );
  await nextTick();
}

export async function mousedownSECellCorner(model: Model, el: Element, xc: string) {
  const { top, left } = toZone(xc);
  triggerMouseEvent(el, "mousedown", getColEndPosition(model, left), getRowEndPosition(model, top));
  await nextTick();
}

export async function mousedownTopCellBorder(model: Model, el: Element, xc: string) {
  const { top, left } = toZone(xc);
  triggerMouseEvent(
    el,
    "mousedown",
    getColStartPosition(model, left) + 10,
    getRowStartPosition(model, top) + 2
  );
  await nextTick();
}

export async function mousedownBottomCellBorder(model: Model, el: Element, xc: string) {
  const { top, left } = toZone(xc);
  triggerMouseEvent(
    el,
    "mousedown",
    getColStartPosition(model, left) + 10,
    getRowEndPosition(model, top) - 2
  );
  await nextTick();
}

export async function mousedownLeftCellBorder(model: Model, el: Element, xc: string) {
  const { top, left } = toZone(xc);
  triggerMouseEvent(
    el,
    "mousedown",
    getColStartPosition(model, left) + 2,
    getRowStartPosition(model, top) + 10
  );
  await nextTick();
}

export async function mousedownRightCellBorder(model: Model, el: Element, xc: string) {
  const { top, left } = toZone(xc);
  triggerMouseEvent(
    el,
    "mousedown",
    getColEndPosition(model, left) - 2,
    getRowStartPosition(model, top) + 10
  );
  await nextTick();
}

export async function mousemoveToCell(model: Model, el: Element, xc: string) {
  const { top, left } = toZone(xc);
  triggerMouseEvent(
    el,
    "mousemove",
    getColStartPosition(model, left) + 10,
    getRowStartPosition(model, top) + 10
  );
  await nextTick();
}
