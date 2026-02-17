import { cssPropertiesToCss } from "@odoo/o-spreadsheet-engine/components/helpers/css";
import { onWillUnmount, useState } from "@odoo/owl";
import { CSSProperties, Pixel, UID } from "../../types";
import { startDnd } from "./drag_and_drop";

type Direction = "horizontal" | "vertical";

interface DragAndDropItemsPartial {
  id: UID;
  size: Pixel;
  position: Pixel;
}

interface DragAndDropItems extends DragAndDropItemsPartial {
  positionAtStart: Pixel;
}

interface DndPartialArgs {
  draggedItemId: UID;
  initialMousePosition: Pixel;
  items: DragAndDropItemsPartial[];
  scrollableContainerEl: HTMLElement;
  onChange?: () => void;
  onCancel?: () => void;
  onDragEnd?: (itemId: UID, indexAtEnd: Pixel) => void;
  /* Wether the dragged item should move smoothly with the mouse, or only move when swapping position with another item. */
  dragMode?: "smooth" | "swap";
}

interface DOMDndHelperArgs extends Omit<Required<DndPartialArgs>, "scrollableContainerEl"> {
  container: ContainerWrapper;
}

interface State {
  itemsStyle: Record<UID, string>;
  draggedItemId: UID | undefined;
  start: (direction: Direction, args: DndPartialArgs) => void;
  cancel: () => void;
}

export function useDragAndDropListItems() {
  let dndHelper: DOMDndHelper | undefined;
  const previousCursor = document.body.style.cursor;
  let cleanupFns: (() => void)[] = [];
  const cleanUp = () => {
    dndHelper = undefined;
    document.body.style.cursor = previousCursor;
    cleanupFns.forEach((fn) => fn());
    cleanupFns = [];
  };

  const start = (direction: Direction, args: DndPartialArgs) => {
    const onChange = () => {
      document.body.style.cursor = "move";
      if (!dndHelper) {
        return;
      }
      Object.assign(state.itemsStyle, dndHelper.getItemStyles());
      args.onChange?.();
    };

    state.cancel = () => {
      state.draggedItemId = undefined;
      state.itemsStyle = {};
      document.body.style.cursor = previousCursor;
      args.onCancel?.();
      cleanUp();
    };

    const onDragEnd = (itemId: UID, indexAtEnd: number) => {
      state.draggedItemId = undefined;
      state.itemsStyle = {};
      document.body.style.cursor = previousCursor;
      args.onDragEnd?.(itemId, indexAtEnd);
      cleanUp();
    };

    document.body.style.cursor = "move";
    state.draggedItemId = args.draggedItemId;
    const container =
      direction === "horizontal"
        ? new HorizontalContainer(args.scrollableContainerEl)
        : new VerticalContainer(args.scrollableContainerEl);
    dndHelper = new DOMDndHelper({
      ...args,
      container,
      onChange,
      onDragEnd,
      onCancel: state.cancel,
      dragMode: args.dragMode || "smooth",
    });
    const stopListening = startDnd(
      dndHelper.onMouseMove.bind(dndHelper),
      dndHelper.onMouseUp.bind(dndHelper)
    );
    cleanupFns.push(stopListening);

    const onScroll = dndHelper.onScroll.bind(dndHelper);
    args.scrollableContainerEl.addEventListener("scroll", onScroll);
    cleanupFns.push(() => args.scrollableContainerEl.removeEventListener("scroll", onScroll));

    cleanupFns.push(dndHelper.destroy.bind(dndHelper));
  };

  onWillUnmount(() => {
    cleanUp();
  });

  const state = useState<State>({
    itemsStyle: {},
    draggedItemId: undefined,
    start,
    cancel: () => {},
  });

  return state;
}

export class DOMDndHelper {
  draggedItemId: UID;

  private items: DragAndDropItems[];
  private container: ContainerWrapper;

  private initialMousePosition: Pixel;
  private currentMousePosition: Pixel;

  private initialScroll: Pixel;

  private minPosition: Pixel;
  private maxPosition: Pixel;
  private dragMode: "smooth" | "swap";

  private edgeScrollIntervalId: number | undefined;

  private onChange: (newPositions: Record<UID, Pixel>) => void;
  private onCancel: () => void;
  private onDragEnd: (itemId: UID, indexAtEnd: number) => void;

  /**
   * The dead zone is an area in which the pointermove events are ignored.
   *
   * This is useful when swapping the dragged item with a larger item. After the swap,
   * the mouse is still hovering on the item  we just swapped with. In this case, we don't want
   * a mouse move to trigger another swap the other way around, so we create a dead zone. We will clear
   * the dead zone when the mouse leaves the swapped item.
   */
  private deadZone: { start: Pixel; end: Pixel } | undefined;

  constructor(args: DOMDndHelperArgs) {
    this.items = args.items.map((item, i) => ({
      ...item,
      positionAtStart: item.position,
      size: args.items[i + 1] ? args.items[i + 1].position - item.position : item.size, // ADRM TODO: remove siz from args (because it depends on gaps, margins & whatnot)
    }));
    this.draggedItemId = args.draggedItemId;
    this.container = args.container;
    this.onChange = args.onChange;
    this.onCancel = args.onCancel;
    this.onDragEnd = args.onDragEnd;
    this.dragMode = args.dragMode;

    this.initialMousePosition = args.initialMousePosition;
    this.currentMousePosition = args.initialMousePosition;

    this.initialScroll = this.container.scroll;

    this.minPosition = this.items[0].position;
    this.maxPosition =
      this.items[this.items.length - 1].position + this.items[this.items.length - 1].size;
  }

  getItemStyles(): Record<UID, string> {
    const styles = this.getItemsStylesObjects();
    const stylesStr: Record<UID, string> = {};
    for (const id in styles) {
      const style = styles[id];
      stylesStr[id] = cssPropertiesToCss(style);
    }
    return stylesStr;
  }

  getItemsStylesObjects(): Record<UID, CSSProperties> {
    const styles: Record<UID, CSSProperties> = {};
    for (const item of this.items) {
      styles[item.id] = this.getItemStyle(item.id);
    }
    return styles;
  }

  private getItemStyle(itemId: string): CSSProperties {
    const position = this.container.cssPositionProperty;
    const style: CSSProperties = {};
    style.position = "relative";
    style[position] = (this.getItemsPositions()[itemId] || 0) + "px";
    style.transition = `${position} 0.5s`;
    style["pointer-events"] = "none";
    if (this.draggedItemId === itemId) {
      style.transition = `${position} 0s`;
      style["z-index"] = "1000";
    }

    return style;
  }

  onScroll() {
    this.moveDraggedItemToPosition(this.currentMousePosition + this.scrollOffset);
  }

  onMouseMove(ev: MouseEvent) {
    if (ev.button > 1) {
      this.onCancel();
      return;
    }
    const mousePosition = this.container.getMousePosition(ev);
    this.currentMousePosition = mousePosition;

    if (mousePosition < this.container.start || mousePosition > this.container.end) {
      this.startEdgeScroll(mousePosition < this.container.start ? -1 : 1);
      return;
    } else {
      this.stopEdgeScroll();
    }

    this.moveDraggedItemToPosition(mousePosition + this.scrollOffset);
  }

  private moveDraggedItemToPosition(position: Pixel) {
    const hoveredItemIndex = this.getHoveredItemIndex(position, this.items);
    const draggedItemIndex = this.items.findIndex((item) => item.id === this.draggedItemId);
    const draggedItem = this.items[draggedItemIndex];

    if (this.deadZone && this.isInZone(position, this.deadZone)) {
      this.onChange(this.getItemsPositions());
      return;
    } else if (
      this.isInZone(position, {
        start: draggedItem.position,
        end: draggedItem.position + draggedItem.size,
      })
    ) {
      this.deadZone = undefined;
    }

    if (draggedItemIndex === hoveredItemIndex) {
      this.onChange(this.getItemsPositions());
      return;
    }

    const startIndex = Math.min(draggedItemIndex, hoveredItemIndex);
    const endIndex = Math.max(draggedItemIndex, hoveredItemIndex);
    const direction = Math.sign(hoveredItemIndex - draggedItemIndex);

    let draggedItemMoveSize = 0;
    for (let i = startIndex; i <= endIndex; i++) {
      if (i === draggedItemIndex) {
        continue;
      }
      this.items[i].position -= direction * draggedItem.size;
      draggedItemMoveSize += this.items[i].size;
    }

    draggedItem.position += direction * draggedItemMoveSize;
    this.items.sort((item1, item2) => item1.position - item2.position);

    this.deadZone =
      direction > 0
        ? { start: position, end: draggedItem.position }
        : { start: draggedItem.position + draggedItem.size, end: position };

    this.onChange(this.getItemsPositions());
  }

  onMouseUp(ev: MouseEvent) {
    if (ev.button !== 0) {
      this.onCancel();
    }

    // ADRM TODO: see if they were needed. Cannot use pointerup in pivotArea otherwise
    // ev.stopPropagation();
    // ev.preventDefault();
    const targetItemIndex = this.items.findIndex((item) => item.id === this.draggedItemId);
    this.onDragEnd(this.draggedItemId, targetItemIndex);
    this.stopEdgeScroll();

    return false;
  }

  private startEdgeScroll(direction: -1 | 1) {
    if (this.edgeScrollIntervalId) {
      return;
    }
    this.edgeScrollIntervalId = window.setInterval(() => {
      const offset = direction * 3;
      this.container.scroll += offset;
    }, 5);
  }

  private stopEdgeScroll() {
    window.clearInterval(this.edgeScrollIntervalId);
    this.edgeScrollIntervalId = undefined;
  }

  /**
   * Get the index of the item the given mouse position is inside.
   * If the mouse is outside the container, return the first or last item index.
   */
  private getHoveredItemIndex(mousePosition: Pixel, items: DragAndDropItems[]): number {
    if (mousePosition <= this.minPosition) {
      return 0;
    }
    if (mousePosition >= this.maxPosition) {
      return items.length - 1;
    }
    return items.findIndex((item) => item.position + item.size >= mousePosition);
  }

  private getItemsPositions(): Record<UID, Pixel> {
    const positions: Record<UID, Pixel> = {};
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (item.id !== this.draggedItemId) {
        positions[item.id] = item.position - item.positionAtStart;
        continue;
      }

      if (this.dragMode === "smooth") {
        const mouseOffset = this.currentMousePosition - this.initialMousePosition;
        let start = mouseOffset + this.scrollOffset;
        start = Math.max(this.minPosition - item.positionAtStart, start);
        start = Math.min(this.maxPosition - item.positionAtStart - item.size, start);
        positions[item.id] = start;
      } else {
        const previousItem = this.items[i - 1];
        const start = previousItem
          ? this.items[i - 1].position + this.items[i - 1].size
          : this.minPosition;
        positions[item.id] = start - item.positionAtStart;
      }
    }

    return positions;
  }

  private isInZone(position: Pixel, zone: { start: Pixel; end: Pixel }) {
    return position >= zone.start && position <= zone.end;
  }

  get scrollOffset() {
    return this.container.scroll - this.initialScroll;
  }

  destroy() {
    this.stopEdgeScroll();
  }
}

abstract class ContainerWrapper {
  constructor(public el: HTMLElement) {}

  abstract get start(): number;
  abstract get end(): number;
  abstract get cssPositionProperty(): string;
  abstract getMousePosition(ev: MouseEvent): number;

  abstract get scroll(): number;
  abstract set scroll(scroll: number);

  protected get containerRect() {
    return this.el.getBoundingClientRect();
  }
}

export class VerticalContainer extends ContainerWrapper {
  get start(): number {
    return this.containerRect.top;
  }
  get end(): number {
    return this.containerRect.bottom;
  }
  get cssPositionProperty(): string {
    return "top";
  }
  get scroll() {
    return this.el.scrollTop;
  }
  set scroll(scroll: number) {
    this.el.scrollTop = scroll;
  }
  getMousePosition(ev: MouseEvent): number {
    return ev.clientY;
  }
}

export class HorizontalContainer extends ContainerWrapper {
  get start(): number {
    return this.containerRect.left;
  }
  get end(): number {
    return this.containerRect.right;
  }
  get cssPositionProperty(): string {
    return "left";
  }
  get scroll() {
    return this.el.scrollLeft;
  }
  set scroll(scroll: number) {
    this.el.scrollLeft = scroll;
  }
  getMousePosition(ev: MouseEvent): number {
    return ev.clientX;
  }
}
