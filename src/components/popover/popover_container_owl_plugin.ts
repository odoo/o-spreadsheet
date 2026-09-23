import { Plugin, shallowEqual, signal } from "@odoo/owl";
import { Rect } from "../../types/rendering";

export class PopoverContainerPlugin extends Plugin {
  rect = signal<Rect>({ x: 0, y: 0, width: 0, height: 0 }, { equals: shallowEqual });

  setContainerRect(rect: Rect) {
    this.rect.set(rect);
  }
}
