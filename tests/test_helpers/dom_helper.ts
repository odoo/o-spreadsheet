import { Model } from "../../src";
import { HEADER_HEIGHT, HEADER_WIDTH } from "../../src/constants";
import { MIN_DELAY, lettersToNumber, scrollDelay, toZone } from "../../src/helpers";
import { DOMCoordinates, Pixel } from "../../src/types";
import { nextTick } from "./helpers";

type DOMTarget = string | Element | Document | Window | null;

export async function simulateClick(
  selector: DOMTarget,
  x: number = 10,
  y: number = 10,
  extra: MouseEventInit = { bubbles: true }
) {
  const target = getTarget(selector);
  triggerMouseEvent(selector, "pointerdown", x, y, extra);
  if (target !== document.activeElement) {
    const oldActiveEl = document.activeElement;
    (document.activeElement as HTMLElement | null)?.dispatchEvent(
      new FocusEvent("blur", { relatedTarget: target })
    );
    /** Dispatching a crafted FocusEvent does not actually focus the target.
     * JSDom pretty much requires us to rely on Element.focus()
     * Because of the problematic behavior addressed in 71a9c8c2,
     * we have to check a posteriori if the target has been properly focused
     * and if not, dispatch a FocusEvent with the relatedTarget to ensure a proper
     * fallback behaviour.
     */
    if (target instanceof HTMLElement) {
      target.focus();
    }
    if (document.activeElement !== target) {
      target.dispatchEvent(new FocusEvent("focus", { relatedTarget: oldActiveEl }));
    }
  }
  triggerMouseEvent(selector, "pointerup", x, y, extra);
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

export async function doubleClick(el: Element, selector: string = "") {
  const event = new MouseEvent("dblclick", { bubbles: true, cancelable: true });
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
  triggerMouseEvent(".o-grid-overlay", "pointermove", x, y);
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
) {
  if (type === "pointermove") {
    extra = { button: -1, ...extra };
  }
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

export function triggerWheelEvent(
  selector: string | EventTarget,
  extra: WheelEventInit = {
    bubbles: true,
    deltaMode: WheelEvent.DOM_DELTA_PIXEL, // = 0
    deltaX: 0,
    deltaY: 0,
  }
) {
  const ev = new WheelEvent("wheel", { bubbles: true, ...extra });
  dispatchEvent(selector, ev);
}

export function triggerKeyboardEvent(
  selector: string | EventTarget,
  type: "keydown" | "keyup",
  eventArgs: KeyboardEventInit
) {
  const ev = new KeyboardEvent(type, { bubbles: true, cancelable: true, ...eventArgs });
  dispatchEvent(selector, ev);
}

function dispatchEvent(selector: string | EventTarget, ev: Event) {
  if (typeof selector === "string") {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`"${selector}" does not match any element.`);
    el.dispatchEvent(ev);
  } else {
    selector.dispatchEvent(ev);
  }
}

export async function setInputValueAndTrigger(
  selector: DOMTarget,
  value: string,
  mode?: "onlyInput" | "onlyChange"
) {
  const input = getTarget(selector) as HTMLInputElement;
  input.value = value;
  if (mode !== "onlyChange") {
    input.dispatchEvent(new Event("input"));
  }
  if (mode !== "onlyInput") {
    input.dispatchEvent(new Event("change"));
  }
  await nextTick();
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
export async function keyDown(eventArgs: KeyboardEventInit): Promise<void> {
  triggerKeyboardEvent(document.activeElement!, "keydown", eventArgs);
  return await nextTick();
}

export async function keyUp(eventArgs: KeyboardEventInit): Promise<void> {
  triggerKeyboardEvent(document.activeElement!, "keyup", eventArgs);
  return await nextTick();
}

export async function focusAndKeyDown(
  selector: DOMTarget,
  eventArgs: KeyboardEventInit
): Promise<void> {
  const target = getTarget(selector);
  (target as HTMLElement).focus?.();
  triggerKeyboardEvent(target, "keydown", eventArgs);
  return await nextTick();
}

export async function focusAndKeyUp(
  selector: DOMTarget,
  eventArgs: KeyboardEventInit
): Promise<void> {
  const target = getTarget(selector);
  (target as HTMLElement).focus?.();
  triggerKeyboardEvent(target, "keyup", eventArgs);
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
  triggerMouseEvent(".o-overlay .o-col-resizer", "pointermove", x, 10);
  await nextTick();
  triggerMouseEvent(".o-overlay .o-col-resizer", "pointerdown", x, 10, extra);
  triggerMouseEvent(window, "pointerup", x, 10);
  await nextTick();
}

export async function dragElement(
  element: Element | string,
  dragOffset: DOMCoordinates,
  startingPosition: DOMCoordinates = { x: 0, y: 0 },
  mouseUp = false
) {
  const { x: startX, y: startY } = startingPosition;
  const { x: offsetX, y: offsetY } = dragOffset;
  triggerMouseEvent(element, "pointerdown", startX, startY);
  triggerMouseEvent(element, "pointermove", startX + offsetX, startY + offsetY);
  if (mouseUp) {
    triggerMouseEvent(element, "pointerup", startX + offsetX, startY + offsetY);
  }
  await nextTick();
}

export async function scrollGrid(args: { deltaY?: number; shiftKey?: boolean }) {
  triggerWheelEvent(".o-grid", { deltaY: args.deltaY || 0, shiftKey: args.shiftKey });
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

/**
 * The Touch API is defined in typescript ^3.7.7 and implemented in most major browsers, but isn't implemented in JSDOM.
 * This implementation is used in test to easily trigger TouchEvents.
 * (TouchEvent is supported by almost all major browsers.)
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/Touch
 */
export class Touch {
  readonly altitudeAngle: number;
  readonly azimuthAngle: number;
  readonly clientX: number;
  readonly clientY: number;
  readonly force: number;
  readonly identifier: number;
  readonly pageX: number;
  readonly pageY: number;
  readonly radiusX: number;
  readonly radiusY: number;
  readonly rotationAngle: number;
  readonly screenX: number;
  readonly screenY: number;
  readonly target: EventTarget;
  readonly touchType: TouchType;
  constructor(touchInitDict: TouchInit) {
    this.identifier = touchInitDict.identifier;
    this.target = touchInitDict.target;
    this.altitudeAngle = touchInitDict.altitudeAngle || 0;
    this.azimuthAngle = touchInitDict.azimuthAngle || 0;
    this.clientX = touchInitDict.clientX || 0;
    this.clientY = touchInitDict.clientY || 0;
    this.force = touchInitDict.force || 0;
    this.pageX = touchInitDict.pageX || 0;
    this.pageY = touchInitDict.pageY || 0;
    this.radiusX = touchInitDict.radiusX || 0;
    this.radiusY = touchInitDict.radiusY || 0;
    this.rotationAngle = touchInitDict.rotationAngle || 0;
    this.screenX = touchInitDict.screenX || 0;
    this.screenY = touchInitDict.screenY || 0;
    this.touchType = touchInitDict.touchType || "direct";
  }
}

export function triggerTouchEvent(
  selector: string | EventTarget,
  type: "touchstart" | "touchend" | "touchmove",
  extra: Partial<Touch>
) {
  const target = typeof selector === "string" ? document.querySelector(selector) : selector;
  if (!target) throw new Error(`"${selector}" does not match any element.`);

  const ev = new TouchEvent(type, {
    cancelable: true,
    bubbles: true,
    touches: [
      new Touch({
        identifier: 1,
        target: target,
        ...extra,
      }),
    ],
  });
  target.dispatchEvent(ev);
}
