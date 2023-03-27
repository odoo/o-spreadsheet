import { Model } from "../../src";
import { HEADER_HEIGHT, HEADER_WIDTH } from "../../src/constants";
import { lettersToNumber, MIN_DELAY, scrollDelay, toZone } from "../../src/helpers";
import { Pixel } from "../../src/types";
import { nextTick } from "./helpers";

type DOMTarget = string | Element | Document | Window | null;

export async function simulateClick(
  selector: DOMTarget,
  x: number = 10,
  y: number = 10,
  extra: MouseEventInit = { bubbles: true }
) {
  const target = getTarget(selector);
  triggerMouseEvent(selector, "mousedown", x, y, extra);
  if (target !== document.activeElement) {
    const oldActiveEl = document.activeElement;
    (document.activeElement as HTMLElement | null)?.dispatchEvent(
      new FocusEvent("blur", { relatedTarget: target })
    );

    target.dispatchEvent(new FocusEvent("focus", { relatedTarget: oldActiveEl }));
  }
  triggerMouseEvent(selector, "mouseup", x, y, extra);
  triggerMouseEvent(selector, "click", x, y, extra);
  await nextTick();
}

function getTarget(target: DOMTarget): Element | Document | Window {
  if (target === null) {
    throw new Error("Target is null");
  }
  if (typeof target === "string") {
    // TODO: use `findElement` instead, and fix tests w/ multiple matched elements
    const els = document.querySelectorAll(target);
    if (els.length === 0) {
      throw new Error(`No element found (selector: ${target})`);
    }
    return els[0];
  } else {
    return target;
  }
}

function findElement(el: Element, selector: string): Element {
  let target = el;
  if (selector) {
    const els = el.querySelectorAll(selector);
    if (els.length === 0) {
      throw new Error(`No element found (selector: ${selector})`);
    }
    if (els.length > 1) {
      throw new Error(`Found ${els.length} elements, instead of 1 (selector: ${selector})`);
    }
    target = els[0];
  }
  return target;
}

export async function click(el: Element, selector: string = "") {
  const event = new MouseEvent("click", { bubbles: true, cancelable: true });
  const target = findElement(el, selector);
  target.dispatchEvent(event);
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
  const sheetId = model.getters.getActiveSheetId();
  if (!model.getters.isVisibleInViewport({ sheetId, col: zone.left, row: zone.top })) {
    throw new Error(`You can't click on ${xc} because it is not visible`);
  }
  let { x, y } = model.getters.getVisibleRect(zone);
  if (!model.getters.isDashboard()) {
    x -= HEADER_WIDTH;
    y -= HEADER_HEIGHT;
  }
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
  selector: DOMTarget,
  type: string,
  offsetX?: number,
  offsetY?: number,
  extra: MouseEventInit = { bubbles: true }
): void {
  const ev = new MouseEvent(type, {
    // this is only correct if we assume the target is positioned
    // at the very top left corner of the screen
    clientX: offsetX,
    clientY: offsetY,
    bubbles: true,
    ...extra,
  });
  (ev as any).offsetX = offsetX;
  (ev as any).offsetY = offsetY;
  const target = getTarget(selector);
  target.dispatchEvent(ev);
}

export function setInputValueAndTrigger(
  selector: DOMTarget,
  value: string,
  eventType: string
): void {
  const input = getTarget(selector) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event(eventType));
}

export function setCheckboxValueAndTrigger(
  selector: string | any,
  checked: boolean,
  eventType: string
): void {
  const checkbox = getTarget(selector) as HTMLInputElement;
  checkbox.checked = checked;
  checkbox.dispatchEvent(new Event(eventType));
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
    new KeyboardEvent("keydown", Object.assign({ key, bubbles: true, cancelable: true }, options))
  );
  return await nextTick();
}

export async function keyUp(key: string, options: any = {}): Promise<void> {
  document.activeElement!.dispatchEvent(
    new KeyboardEvent("keyup", Object.assign({ key, bubbles: true, cancelable: true }, options))
  );
  return await nextTick();
}

export function getElComputedStyle(selector: string, style: string): string {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`No element matching selector "${selector}"`);
  return window.getComputedStyle(element)[style];
}

export function getElStyle(selector: string, style: string): string {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`No element matching selector "${selector}"`);
  return element.style[style];
}

/**
 * Select a column
 * @param model
 * @param letter Name of the column to click on (Starts at 'A')
 * @param extra shiftKey, ctrlKey
 */
export async function selectColumnByClicking(model: Model, letter: string, extra: any = {}) {
  const index = lettersToNumber(letter);
  const x = model.getters.getColDimensions(model.getters.getActiveSheetId(), index)!.start + 1;
  triggerMouseEvent(".o-overlay .o-col-resizer", "mousemove", x, 10);
  await nextTick();
  triggerMouseEvent(".o-overlay .o-col-resizer", "mousedown", x, 10, extra);
  triggerMouseEvent(window, "mouseup", x, 10);
  await nextTick();
}

export async function dragElement(
  element: Element | string,
  dragOffset: { x: Pixel; y: Pixel },
  startingPosition: { x: Pixel; y: Pixel } = { x: 0, y: 0 },
  mouseUp = false
) {
  const { x: startX, y: startY } = startingPosition;
  const { x: offsetX, y: offsetY } = dragOffset;
  triggerMouseEvent(element, "mousedown", startX, startY);
  triggerMouseEvent(element, "mousemove", startX + offsetX, startY + offsetY);
  if (mouseUp) {
    triggerMouseEvent(element, "mouseup", startX + offsetX, startY + offsetY);
  }
  await nextTick();
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
