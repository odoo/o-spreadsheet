import { ScrollDirection } from "../../../src/components/scrollbar";

export class ScrollBar {
  private scrollValue: number;
  el: HTMLElement;
  constructor(el: HTMLElement | null, direction: ScrollDirection) {
    this.el = el!;
    this.scrollValue = 0;
  }

  get scroll(): number {
    return this.scrollValue;
  }

  set scroll(value: number) {
    this.scrollValue = value;
    this.el.dispatchEvent(new MouseEvent("scroll", { bubbles: true }));
  }
}
