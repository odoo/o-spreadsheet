import { nextTick } from "./helpers";

export async function simulateClick(selector: string, x: number = 10, y: number = 10) {
  const target = document.querySelector(selector)! as HTMLElement;
  triggerMouseEvent(selector, "mousedown", x, y);
  target.focus();
  triggerMouseEvent(selector, "mouseup", x, y);
  triggerMouseEvent(selector, "click", x, y);
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
