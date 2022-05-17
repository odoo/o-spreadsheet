export type ScrollDirection = "horizontal" | "vertical";

export class ScrollBar {
  private direction: ScrollDirection;
  el: HTMLElement;
  constructor(el: HTMLElement | null, direction: ScrollDirection, zoom: () => number = () => 1) {
    this.el = el!;
    this.direction = direction;
  }

  get scroll(): number {
    const value = this.direction === "horizontal" ? this.el.scrollLeft : this.el.scrollTop;
    console.log("get scroll", value);
    return value;
  }

  set scroll(value: number) {
    console.log("set scroll", value * 1);
    if (this.direction === "horizontal") {
      this.el.scrollLeft = value * 1;
    } else {
      this.el.scrollTop = value * 1;
    }
  }
}
