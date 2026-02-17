import { PixelPosition } from "@odoo/o-spreadsheet-engine";
import { PivotDimension, PivotField, PivotMeasure } from "../types";

export type PivotDragAndDropItem =
  | { type: "measure"; id: string; label: string; measure: PivotMeasure }
  | { type: "row" | "column"; id: string; label: string; dimension: PivotDimension }
  | { type: "field"; id: string; label: string; field: PivotField };

export class PivotDragAndDropStore {
  mutators = ["startDragAndDrop", "endDragAndDrop", "moveItem"] as const;

  containerId: string | undefined = undefined;
  draggedItem: PivotDragAndDropItem | undefined = undefined;
  draggedItemLabel: string | undefined = undefined;
  itemPosition: PixelPosition | undefined = undefined;

  startDragAndDrop(
    containerId: string,
    item: PivotDragAndDropItem,
    initialPosition: PixelPosition
  ) {
    this.containerId = containerId;
    this.draggedItem = item;
    this.itemPosition = initialPosition;
  }

  endDragAndDrop(containerId: string) {
    if (this.containerId === containerId) {
      this.containerId = undefined;
      this.draggedItem = undefined;
      this.itemPosition = undefined;
    }
  }

  moveItem(containerId: string, position: PixelPosition) {
    if (containerId !== this.containerId) {
      return "noStateChange";
    }
    this.itemPosition = position;
    // const el = document.querySelector<HTMLElement>(`.o-pivot-dragged-element`);
    // if (el) {
    // el.style.left = position.x + "px";
    // el.style.top = position.y + "px";
    // el.style.transform = `translate(${position.x}px, ${position.y}px)`;
    // }

    return undefined;
  }
}
