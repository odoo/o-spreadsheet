import { Rect, UuidGenerator } from "@odoo/o-spreadsheet-engine";
import { cssPropertiesToCss } from "@odoo/o-spreadsheet-engine/components/helpers/css";
import { onWillUnmount, useEffect, useState } from "@odoo/owl";
import { useStore } from "../../store_engine";
import {
  PivotDragAndDropItem,
  PivotDragAndDropStore,
} from "../../stores/pivot_drag_and_drop_store";
import { Pixel, Ref, UID } from "../../types";
import { startDnd } from "./drag_and_drop";
import {
  DOMDndHelper,
  HorizontalContainer,
  VerticalContainer,
} from "./drag_and_drop_dom_items_hook";

// ADRM TODO: un-duplicate, and rename the file

type Direction = "horizontal" | "vertical";

interface DragAndDropItemsPartial {
  id: UID;
  size: Pixel;
  position: Pixel;
}

export type PivotDragEndEvent =
  | { type: "REMOVE"; item: PivotDragAndDropItem }
  | { type: "MOVE"; item: PivotDragAndDropItem; moveToIndex: number }
  | { type: "ADD"; item: PivotDragAndDropItem; index: number };

export interface PivotDragAndDropState {
  itemsStyle: Record<UID, string>;
  draggedItemId: UID | undefined;
  cancel: () => void;
}

interface Args {
  containerRef: Ref<HTMLElement>;
  direction: Direction;
  getDraggedItems: (ev: MouseEvent) => { id: string; rect: Rect }[];
  getDraggedItemAtCursor: (ev: MouseEvent) => PivotDragAndDropItem | undefined;
  onDragEnd: (dragEndEvent: PivotDragEndEvent) => void;
}

export function useDragAndDropPivotItems(hookArgs: Args) {
  const store = useStore(PivotDragAndDropStore);
  const containerId = new UuidGenerator().smallUuid();

  let dndHelper: DOMDndHelper | undefined;
  const previousCursor = document.body.style.cursor;
  let cleanupFns: (() => void)[] = [];
  let itemOffsets: Record<UID, Pixel> = {};
  let operation: PivotDragEndEvent["type"] | undefined = undefined;
  let draggedItem: PivotDragAndDropItem | undefined = undefined;
  let hiddenItem: UID | undefined = undefined;

  const cleanUp = () => {
    dndHelper = undefined;
    document.body.style.cursor = previousCursor;
    cleanupFns.forEach((fn) => fn());
    cleanupFns = [];
    store.endDragAndDrop(containerId);
    itemOffsets = {};
    operation = undefined;
    draggedItem = undefined;
    hiddenItem = undefined;
  };

  const start = (
    ev: MouseEvent,
    draggedItemId: string,
    draggedItems: DragAndDropItemsPartial[]
  ) => {
    const onChange = () => {
      document.body.style.cursor = "move";
      if (!dndHelper) {
        return;
      }
      const styles = dndHelper.getItemsStylesObjects();
      if (hiddenItem) {
        styles[hiddenItem] = { display: "none !important" };
      }
      const position = hookArgs.direction === "horizontal" ? "left" : "top";
      const dimension = hookArgs.direction === "horizontal" ? "width" : "height";
      const otherDimension = hookArgs.direction === "horizontal" ? "height" : "width";
      const placeHolderSize =
        draggedItems.find((item) => item.id === "placeholder-item")?.size || 0;
      if (styles["placeholder-item"] && placeHolderSize) {
        styles["placeholder-item"][dimension] = placeHolderSize + "px";
        styles["placeholder-item"][otherDimension] = "stretch";
        styles["placeholder-item"].background = "rgba(0, 0, 0, 0.1)";
        if (operation === "REMOVE") {
          styles["placeholder-item"].visibility = "hidden";
        }
      }

      for (const item of draggedItems) {
        styles[item.id][position] =
          parseInt(styles[item.id][position]!) + (itemOffsets[item.id] || 0) + "px";
      }

      const stylesStr: Record<UID, string> = {};
      for (const id in styles) {
        const style = styles[id];
        stylesStr[id] = cssPropertiesToCss(style);
      }
      Object.assign(state.itemsStyle, stylesStr);
    };

    state.cancel = () => {
      state.draggedItemId = undefined;
      state.itemsStyle = {};
      document.body.style.cursor = previousCursor;
      cleanUp();
    };

    const onDragEnd = (itemId: UID, indexAtEnd: number) => {
      if (draggedItem && operation === "MOVE") {
        hookArgs.onDragEnd({ type: "MOVE", item: draggedItem, moveToIndex: indexAtEnd });
      } else if (draggedItem && operation === "ADD") {
        hookArgs.onDragEnd({ type: "ADD", item: draggedItem, index: indexAtEnd });
      } else if (draggedItem && operation === "REMOVE") {
        hookArgs.onDragEnd({ type: "REMOVE", item: draggedItem });
      }
      state.draggedItemId = undefined;
      state.itemsStyle = {};
      document.body.style.cursor = previousCursor;
      cleanUp();
    };

    document.body.style.cursor = "move";
    const direction = hookArgs.direction;
    state.draggedItemId = draggedItemId;
    const container =
      direction === "horizontal"
        ? new HorizontalContainer(hookArgs.containerRef.el!)
        : new VerticalContainer(hookArgs.containerRef.el!);
    dndHelper = new DOMDndHelper({
      draggedItemId,
      items: draggedItems,
      initialMousePosition: direction === "horizontal" ? ev.clientX : ev.clientY,
      container,
      onChange: () => {},
      onDragEnd,
      onCancel: state.cancel,
      dragMode: "swap",
    });
    const stopListening = startDnd((ev: PointerEvent) => {
      store.moveItem(containerId, { x: ev.clientX, y: ev.clientY });
      dndHelper?.onMouseMove(ev);
      onChange();
    }, dndHelper.onMouseUp.bind(dndHelper));
    cleanupFns.push(stopListening);

    const onScroll = dndHelper.onScroll.bind(dndHelper);
    hookArgs.containerRef.el!.addEventListener("scroll", onScroll);
    cleanupFns.push(() => hookArgs.containerRef.el!.removeEventListener("scroll", onScroll));

    cleanupFns.push(dndHelper.destroy.bind(dndHelper));
  };

  onWillUnmount(() => {
    cleanUp();
  });

  const onMouseDown = (ev: PointerEvent) => {
    draggedItem = hookArgs.getDraggedItemAtCursor(ev);
    if (!draggedItem) {
      return;
    }
    operation = "MOVE";
    const pivotItems = hookArgs.getDraggedItems(ev);
    const dragAndDropItems = pivotItems.map((item) => ({
      id: item.id,
      position: hookArgs.direction === "horizontal" ? item.rect.x : item.rect.y,
      size: hookArgs.direction === "horizontal" ? item.rect.width : item.rect.height,
    }));
    store.startDragAndDrop(containerId, draggedItem, { x: ev.clientX, y: ev.clientY });
    const id = draggedItem.id;
    hiddenItem = id;

    const draggedItemIndex = dragAndDropItems.findIndex((item) => item.id === id);
    if (draggedItemIndex === -1) {
      return;
    }
    const placeholderItem: DragAndDropItemsPartial = {
      id: "placeholder-item",
      size: dragAndDropItems[draggedItemIndex].size,
      position: dragAndDropItems[draggedItemIndex].position,
    };
    dragAndDropItems.splice(draggedItemIndex, 1, placeholderItem);
    console.log(dragAndDropItems);
    for (let i = draggedItemIndex; i < dragAndDropItems.length; i++) {
      itemOffsets[dragAndDropItems[i].id] = placeholderItem.size;
    }
    const lastItem = dragAndDropItems[dragAndDropItems.length - 1];
    itemOffsets["placeholder-item"] =
      dragAndDropItems[draggedItemIndex].position +
      placeholderItem.size -
      (lastItem.position + lastItem.size);

    start(ev, "placeholder-item", dragAndDropItems);
  };

  const onMouseEnter = (ev: PointerEvent) => {
    draggedItem = store.draggedItem;
    if (!store.draggedItem) {
      return;
    }
    if (store.containerId === containerId) {
      operation = "MOVE";
      return;
    }
    operation = "ADD";
    draggedItem = store.draggedItem;
    const pivotItems = hookArgs.getDraggedItems(ev);
    const dragAndDropItems = pivotItems.map((item) => ({
      id: item.id,
      position: hookArgs.direction === "horizontal" ? item.rect.x : item.rect.y,
      size: hookArgs.direction === "horizontal" ? item.rect.width : item.rect.height,
    }));
    const mousePosition = hookArgs.direction === "horizontal" ? ev.clientX : ev.clientY;
    let indexAtCursor = dragAndDropItems.findIndex(
      (item) => item.position + item.size > mousePosition
    );
    if (indexAtCursor === -1) {
      indexAtCursor = dragAndDropItems.length;
    }
    const placeHolderSize = dragAndDropItems[0]?.size || 100;
    const lastItem = dragAndDropItems[dragAndDropItems.length - 1];
    const placeHolderPosition =
      dragAndDropItems[indexAtCursor]?.position ||
      (lastItem ? lastItem.position + lastItem.size : 0);
    const placeholderItem: DragAndDropItemsPartial = {
      id: "placeholder-item",
      size: placeHolderSize,
      position: placeHolderPosition,
    };
    itemOffsets["placeholder-item"] = lastItem
      ? placeHolderPosition - (lastItem.position + lastItem.size)
      : 0;
    for (let i = indexAtCursor; i < dragAndDropItems.length; i++) {
      dragAndDropItems[i].position += placeHolderSize;
      itemOffsets[dragAndDropItems[i].id] = placeHolderSize;
    }
    dragAndDropItems.splice(indexAtCursor, 0, placeholderItem);

    console.log("onMouserEnter", dragAndDropItems);
    start(ev, "placeholder-item", dragAndDropItems);
  };

  const onMouseLeave = (ev: PointerEvent) => {
    if (!store.containerId) {
      return;
    }
    draggedItem = store.draggedItem;
    console.log("onMouseLeave", store.containerId !== containerId);

    if (store.containerId !== containerId) {
      state.cancel();
    } else {
      operation = "REMOVE";
    }
  };

  useEffect(
    () => {
      const containerEl = hookArgs.containerRef.el;
      if (!containerEl) {
        return;
      }
      containerEl.addEventListener("pointerdown", onMouseDown);
      containerEl.addEventListener("pointerenter", onMouseEnter);
      containerEl.addEventListener("pointerleave", onMouseLeave);
      return () => {
        containerEl.removeEventListener("pointerdown", onMouseDown);
        containerEl.removeEventListener("pointerenter", onMouseEnter);
        containerEl.removeEventListener("pointerleave", onMouseLeave);
      };
    },
    () => [hookArgs.containerRef.el]
  );

  const state = useState<PivotDragAndDropState>({
    itemsStyle: {},
    draggedItemId: undefined,
    cancel: () => {},
  });

  return state;
}
