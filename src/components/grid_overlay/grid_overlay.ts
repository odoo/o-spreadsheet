import { onMounted, onWillUnmount, plugin, props, Signal, signal, useListener } from "@odoo/owl";
import { deepEquals } from "../../helpers/misc";
import { isPointInsideRect } from "../../helpers/rectangle";
import { positionToZone } from "../../helpers/zones";
import { Component, useExternalListener } from "../../owl3_compatibility_layer";
import { useStore } from "../../store_engine/store_hooks";
import { GridClickModifiers, HeaderIndex, Position } from "../../types/misc";
import { DOMCoordinates } from "../../types/rendering";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { Store } from "../../types/store_engine";
import { FiguresContainer } from "../figures/figure_container/figure_container";
import { GridAddRowsFooter } from "../grid_add_rows_footer/grid_add_rows_footer";
import { cssPropertiesToCss } from "../helpers/css";
import { getElBoundingRect, isChildEvent, isCtrlKey } from "../helpers/dom_helpers";
import { useInterval } from "../helpers/time_hooks";
import { withZoom, ZoomedMouseEvent } from "../helpers/zoom";
import { CellPopoverPlugin } from "../owl_plugins/cell_popover_plugin";
import { DelayedHoveredCellPlugin } from "../owl_plugins/delayed_hovered_cell_plugin";
import { HoveredIconPlugin } from "../owl_plugins/hovered_icon_plugin";
import { HoveredTablePlugin } from "../owl_plugins/hovered_table_plugin";
import { PaintFormatStore } from "../paint_format_button/paint_format_store";
import { types } from "../props_validation";

function useCellHovered(
  env: SpreadsheetChildEnv,
  gridRef: Signal<HTMLElement | null>
): Partial<Position> {
  const delayedHoveredCell = plugin(DelayedHoveredCellPlugin);
  const hoveredTable = plugin(HoveredTablePlugin);
  const hoveredPosition: Partial<Position> = {
    col: undefined,
    row: undefined,
  };
  const { Date } = window;
  let x: number | undefined = undefined;
  let y: number | undefined = undefined;
  let lastMoved = 0;

  function getPosition(): Position {
    if (x === undefined || y === undefined) {
      return { col: -1, row: -1 };
    }
    const col = env.model.getters.getColIndex(x);
    const row = env.model.getters.getRowIndex(y);
    return { col, row };
  }

  function getOffsetRelativeToOverlay(
    zoomedMouseEvent: ZoomedMouseEvent<MouseEvent>
  ): DOMCoordinates {
    const gridRect = getElBoundingRect(gridRef());
    return {
      x: zoomedMouseEvent.clientX - gridRect.x,
      y: zoomedMouseEvent.clientY - gridRect.y,
    };
  }

  const { pause, resume } = useInterval(checkTiming, 200);

  function checkTiming() {
    const { col, row } = getPosition();
    const delta = Date.now() - lastMoved;
    if (delta > 300 && (col !== hoveredPosition.col || row !== hoveredPosition.row)) {
      setPosition(undefined, undefined);
    }
    if (delta > 300) {
      if (col < 0 || row < 0) {
        return;
      }
      setPosition(col, row);
    }
  }
  function updateMousePosition(zoomedMouseEvent: ZoomedMouseEvent<MouseEvent>) {
    if (isChildEvent(gridRef(), zoomedMouseEvent.ev)) {
      ({ x, y } = getOffsetRelativeToOverlay(zoomedMouseEvent));
      lastMoved = Date.now();
      hoveredTable.hover(getPosition());
    }
  }

  function recompute() {
    const { col, row } = getPosition();
    if (col !== hoveredPosition.col || row !== hoveredPosition.row) {
      setPosition(undefined, undefined);
    }
  }

  function onMouseLeave(e: MouseEvent) {
    const zoomedMouseEvent = withZoom(env, e);
    const { x, y } = getOffsetRelativeToOverlay(zoomedMouseEvent);
    const gridRect = getElBoundingRect(gridRef());

    if (y < 0 || y > gridRect.height || x < 0 || x > gridRect.width) {
      return updateMousePosition(zoomedMouseEvent);
    } else {
      return pause();
    }
  }

  useListener(
    gridRef,
    "pointermove",
    (ev: MouseEvent) => !env.isMobile() && updateMousePosition(withZoom(env, ev))
  );
  useListener(gridRef, "mouseleave", onMouseLeave);
  useListener(gridRef, "mouseenter", resume);
  useListener(gridRef, "pointerdown", recompute);
  useListener(
    gridRef,
    "pointerdown",
    (ev: MouseEvent) => env.isMobile() && updateMousePosition(withZoom(env, ev))
  );

  useExternalListener(window, "click", handleGlobalClick);
  function handleGlobalClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    const grid = gridRef();
    if (grid && !grid.contains(target)) {
      setPosition(undefined, undefined);
    }
  }

  function setPosition(col?: number, row?: number) {
    if (col !== hoveredPosition.col || row !== hoveredPosition.row) {
      hoveredPosition.col = col;
      hoveredPosition.row = row;
      delayedHoveredCell.hover({ col, row });
    }
  }
  return hoveredPosition;
}

export class GridOverlay extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GridOverlay";
  static components = {
    FiguresContainer,
    GridAddRowsFooter,
  };

  protected props = props(
    {
      "onCellDoubleClicked?": types.function<(col: HeaderIndex, row: HeaderIndex) => void>(),
      "onCellClicked?":
        types.function<
          (
            col: HeaderIndex,
            row: HeaderIndex,
            modifiers: GridClickModifiers,
            zoomedMouseEvent: ZoomedMouseEvent<MouseEvent | PointerEvent>
          ) => void
        >(),
      "onCellRightClicked?":
        types.function<(col: HeaderIndex, row: HeaderIndex, coordinates: DOMCoordinates) => void>(),
      "onGridResized?": types.function(),
      gridOverlayDimensions: types.string(),
    },
    {
      onCellDoubleClicked: () => {},
      onCellClicked: () => {},
      onCellRightClicked: () => {},
      onGridResized: () => {},
    }
  );
  private gridOverlayRef: Signal<HTMLElement | null> = signal(null);
  private cellPopovers = plugin(CellPopoverPlugin);
  private paintFormatStore!: Store<PaintFormatStore>;
  private hoveredIconPlugin = plugin(HoveredIconPlugin);

  setup() {
    useCellHovered(this.env, this.gridOverlayRef);
    const resizeObserver = new ResizeObserver(() => {
      this.props.onGridResized();
    });
    onMounted(() => {
      resizeObserver.observe(this.gridOverlayEl);
    });
    onWillUnmount(() => {
      resizeObserver.disconnect();
    });

    this.paintFormatStore = useStore(PaintFormatStore);
  }

  get gridOverlayEl(): HTMLElement {
    const el = this.gridOverlayRef();
    if (!el) {
      throw new Error("GridOverlay el is not defined.");
    }
    return el;
  }

  get style() {
    return (
      this.props.gridOverlayDimensions +
      cssPropertiesToCss({ cursor: this.hoveredIconPlugin.hoveredIcon() ? "pointer" : "default" })
    );
  }

  get isPaintingFormat() {
    return this.paintFormatStore.isActive;
  }

  onPointerMove(ev: MouseEvent) {
    if (this.env.isMobile()) {
      return;
    }
    const icon = this.getInteractiveIconAtEvent(withZoom(this.env, ev));
    const hoveredIcon = icon?.type ? { id: icon.type, position: icon.position } : undefined;
    if (!deepEquals(hoveredIcon, this.hoveredIconPlugin.hoveredIcon())) {
      this.hoveredIconPlugin.setHoveredIcon(hoveredIcon);
    }
  }

  onPointerDown(ev: PointerEvent) {
    if (ev.button > 0 || this.env.isMobile()) {
      // not main button, probably a context menu
      return;
    }
    this.onCellClicked(withZoom(this.env, ev));
  }

  onClick(ev: MouseEvent) {
    if (ev.button > 0 || !this.env.isMobile()) {
      // not main button, probably a context menu
      return;
    }
    this.onCellClicked(withZoom(this.env, ev));
  }

  onCellClicked(zoomedMouseEvent: ZoomedMouseEvent<MouseEvent | PointerEvent>) {
    const openedPopover = this.cellPopovers.persistentCellPopover;
    const [col, row] = this.getCartesianCoordinates(zoomedMouseEvent);
    const clickedIcon = this.getInteractiveIconAtEvent(zoomedMouseEvent);
    if (clickedIcon) {
      this.env.model.selection.getBackToDefault();
    }
    this.props.onCellClicked(
      col,
      row,
      {
        expandZone: zoomedMouseEvent.ev.shiftKey,
        addZone: isCtrlKey(zoomedMouseEvent.ev),
      },
      zoomedMouseEvent
    );

    if (clickedIcon?.onClick) {
      clickedIcon.onClick(clickedIcon.position, this.env);
    }

    if (
      zoomedMouseEvent.ev.target === this.gridOverlayRef() &&
      this.cellPopovers.isOpen &&
      deepEquals(openedPopover, this.cellPopovers.persistentCellPopover)
    ) {
      // Only close the popover if props.click/icon.click didn't open a new one
      this.cellPopovers.close();
      return;
    }
  }

  onDoubleClick(ev: MouseEvent) {
    const zoomedMouseEvent = withZoom(this.env, ev);
    if (this.getInteractiveIconAtEvent(zoomedMouseEvent)) {
      return;
    }

    const [col, row] = this.getCartesianCoordinates(zoomedMouseEvent);
    this.props.onCellDoubleClicked(col, row);
  }

  onContextMenu(ev: MouseEvent) {
    const [col, row] = this.getCartesianCoordinates(withZoom(this.env, ev));
    this.props.onCellRightClicked(col, row, { x: ev.clientX, y: ev.clientY });
  }

  private getCartesianCoordinates(
    zoomedMouseEvent: ZoomedMouseEvent<MouseEvent>
  ): [HeaderIndex, HeaderIndex] {
    const colIndex = this.env.model.getters.getColIndex(zoomedMouseEvent.offsetX);
    const rowIndex = this.env.model.getters.getRowIndex(zoomedMouseEvent.offsetY);
    return [colIndex, rowIndex];
  }

  private getInteractiveIconAtEvent(zoomedMouseEvent: ZoomedMouseEvent<MouseEvent>) {
    const gridOverLayRect = getElBoundingRect(this.gridOverlayRef());
    const gridOffset = this.env.model.getters.getGridOffset();
    const x = zoomedMouseEvent.clientX - gridOverLayRect.x + gridOffset.x;
    const y = zoomedMouseEvent.clientY - gridOverLayRect.y + gridOffset.y;

    const [col, row] = this.getCartesianCoordinates(zoomedMouseEvent);
    const sheetId = this.env.model.getters.getActiveSheetId();

    let position = { col, row, sheetId };
    const merge = this.env.model.getters.getMerge(position);
    if (merge) {
      position = { col: merge.left, row: merge.top, sheetId };
    }

    const icons = this.env.model.getters.getCellIcons(position);
    const icon = icons.find((icon) => {
      const merge = this.env.model.getters.getMerge(position);
      const zone = merge || positionToZone(position);
      const cellRect = this.env.model.getters.getRect(zone);

      return isPointInsideRect(x, y, this.env.model.getters.getCellIconRect(icon, cellRect));
    });
    return icon?.onClick ? icon : undefined;
  }
}
