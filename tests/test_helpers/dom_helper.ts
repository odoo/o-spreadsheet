import { Model } from "../../src";
import { toZone } from "../../src/helpers";
import { nextTick } from "./helpers";

export async function simulateClick(selector: string | any, x: number = 10, y: number = 10) {
  let target;
  if (typeof selector === "string") {
    target = document.querySelector(selector) as HTMLElement;
    if (!target) {
      throw new Error(`"${selector}" does not match any element.`);
    }
  } else {
    target = selector;
  }
  triggerMouseEvent(selector, "mousedown", x, y);
  if (target !== document.activeElement) {
    (document.activeElement as HTMLElement | null)?.blur();
    target.focus();
  }
  triggerMouseEvent(selector, "mouseup", x, y);
  triggerMouseEvent(selector, "click", x, y);
  await nextTick();
}

export async function clickCell(model: Model, xc: string) {
  const zone = toZone(xc);
  const viewport = model.getters.getActiveViewport();
  const [x, y, ,] = model.getters.getCanvasRect(zone, viewport);

  await simulateClick("canvas", x, y);
}

export async function rightClickCell(model: Model, xc: string) {
  const zone = toZone(xc);
  const viewport = model.getters.getActiveViewport();
  const [x, y, ,] = model.getters.getCanvasRect(zone, viewport);
  triggerMouseEvent("canvas", "contextmenu", x, y);
  await nextTick();
}

export function triggerMouseEvent(
  selector: string | any,
  type: string,
  x?: number,
  y?: number,
  extra: any = { bubbles: true }
): void {
  const ev = new MouseEvent(type, {
    clientX: x,
    clientY: y,
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
