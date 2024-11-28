import { Pixel } from "../types";

export type ScrollDirection = "horizontal" | "vertical";

export class ScrollBar {
  private direction: ScrollDirection;
  el: HTMLElement;
  constructor(el: HTMLElement | null, direction: ScrollDirection) {
    this.el = el!;
    this.direction = direction;
  }

  get scroll(): Pixel {
    return this.direction === "horizontal" ? this.el.scrollLeft : this.el.scrollTop;
  }

  set scroll(value: Pixel) {
    if (this.direction === "horizontal") {
      this.el.scrollLeft = value;
    } else {
      this.el.scrollTop = value;
    }
  }
}
