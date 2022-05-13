export type ScrollDirection = "horizontal" | "vertical";

export class ScrollBar {
  private direction: ScrollDirection;
  el: HTMLElement;
  constructor(
    el: HTMLElement | null,
    direction: ScrollDirection,
    private zoom: () => number = () => 1
  ) {
    this.el = el!;
    this.direction = direction;
  }

  get scroll(): number {
    return (this.direction === "horizontal" ? this.el.scrollLeft : this.el.scrollTop) / this.zoom();
  }

  set scroll(value: number) {
    if (this.direction === "horizontal") {
      this.el.scrollLeft = value * this.zoom();
    } else {
      this.el.scrollTop = value * this.zoom();
    }
  }
}
