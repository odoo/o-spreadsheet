import { Component, onWillUpdateProps, useRef } from "@odoo/owl";
import { deepEqualsArray } from "../../helpers";
import { useDragAndDropListItems } from "../helpers/drag_and_drop_hook";

interface Props {
  draggableItemIds: string[];
  onDragEnd: (draggedItemId: string, originalIndex: number, finalIndex: number) => void;
  canStartDrag: (event: MouseEvent) => boolean;
  direction: "horizontal" | "vertical";
  containerClass?: string;
  slots?: Record<string, any>;
}

export class DragAndDropListItems extends Component<Props> {
  static template = "o-spreadsheet-DragAndDropListItems";
  static props = {
    draggableItemIds: { type: Array },
    onDragEnd: { type: Function },
    direction: { type: String, optional: true },
    canStartDrag: { type: Function, optional: true },
    containerClass: { type: String, optional: true },
    slots: { type: Object, optional: true },
  };
  static defaultProps = {
    canStartDrag: () => true,
    direction: "vertical",
  };
  private containerRef = useRef("container-ref");
  private dragAndDrop = useDragAndDropListItems();

  setup() {
    onWillUpdateProps((nextProps: Props) => {
      if (!deepEqualsArray(this.props.draggableItemIds, nextProps.draggableItemIds)) {
        this.dragAndDrop.cancel();
      }
    });
  }

  startDragAndDrop(itemId: string, event: MouseEvent) {
    if (event.button !== 0 || !this.props.canStartDrag(event)) {
      return;
    }
    const rects = this.getDimensionElementsRects();
    const direction = this.props.direction;
    const isVertical = direction === "vertical";
    const items = this.props.draggableItemIds.map((itemId, index) => ({
      id: itemId,
      size: isVertical ? rects[index].height : rects[index].width,
      position: isVertical ? rects[index].y : rects[index].x,
    }));
    this.dragAndDrop.start(direction, {
      draggedItemId: itemId,
      initialMousePosition: isVertical ? event.clientY : event.clientX,
      items,
      containerEl: this.containerRef.el!,
      onDragEnd: this.onDragEnd.bind(this),
    });
  }

  private onDragEnd(draggedItemId: string, finalIndex: number) {
    const originalIndex = this.props.draggableItemIds.findIndex(
      (itemId) => itemId === draggedItemId
    );
    if (originalIndex === finalIndex) {
      return;
    }
    this.props.onDragEnd(draggedItemId, originalIndex, finalIndex);
  }

  getDimensionElementsRects() {
    return Array.from(this.containerRef.el!.children).map((el) => {
      const style = getComputedStyle(el)!;
      const rect = el.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width + parseInt(style.marginLeft || "0") + parseInt(style.marginRight || "0"),
        height:
          rect.height + parseInt(style.marginTop || "0") + parseInt(style.marginBottom || "0"),
      };
    });
  }
}
