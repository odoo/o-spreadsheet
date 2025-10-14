import { Component, onMounted, onWillUnmount, useExternalListener, useRef } from "@odoo/owl";
import { Store, useStore } from "../../store_engine";
import {
  DOMCoordinates,
  GridClickModifiers,
  HeaderIndex,
  Pixel,
  Position,
  Rect,
  Ref,
  SpreadsheetChildEnv,
} from "../../types";
import { DataValidationOverlay } from "../data_validation_overlay/data_validation_overlay";
import { FiguresContainer } from "../figures/figure_container/figure_container";
import { FilterIconsOverlay } from "../filters/filter_icons_overlay/filter_icons_overlay";
import { DelayedHoveredCellStore } from "../grid/delayed_hovered_cell_store";
import { GridAddRowsFooter } from "../grid_add_rows_footer/grid_add_rows_footer";
import { css } from "../helpers";
import { getBoundingRectAsPOJO, isChildEvent, isCtrlKey } from "../helpers/dom_helpers";
import { useRefListener } from "../helpers/listener_hook";
import { useAbsoluteBoundingRect } from "../helpers/position_hook";
import { useInterval } from "../helpers/time_hooks";
import { PaintFormatStore } from "../paint_format_button/paint_format_store";
import { CellPopoverStore } from "../popover";
import { HoveredTableStore } from "../tables/hovered_table_store";

const CURSOR_SVG = /*xml*/ `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="14" height="16"><path d="M6.5.4c1.3-.8 2.9-.1 3.8 1.4l2.9 5.1c.2.4.9 1.6-.4 2.3l-1.6.9 1.8 3.1c.2.4.1 1-.2 1.2l-1.6 1c-.3.1-.9 0-1.1-.4l-1.8-3.1-1.6 1c-.6.4-1.7 0-2.2-.8L0 4.3"/><path fill="#fff" d="M9.1 2a1.4 1.1 60 0 0-1.7-.6L5.5 2.5l.9 1.6-1 .6-.9-1.6-.6.4 1.8 3.1-1.3.7-1.8-3.1-1 .6 3.8 6.6 6.8-3.98M3.9 8.8 10.82 5l.795 1.4-6.81 3.96"/></svg>
`;

css/* scss */ `
  .o-paint-format-cursor {
    cursor: url("data:image/svg+xml,${encodeURIComponent(CURSOR_SVG)}"), auto;
  }
`;

function useCellHovered(env: SpreadsheetChildEnv, gridRef: Ref<HTMLElement>): Partial<Position> {
  const delayedHoveredCell = useStore(DelayedHoveredCellStore);
  const hoveredTable = useStore(HoveredTableStore);
  let hoveredPosition: Partial<Position> = {
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

  function getOffsetRelativeToOverlay(ev: MouseEvent): DOMCoordinates {
    const gridRect = getBoundingRectAsPOJO(gridRef.el!);
    return {
      x: ev.clientX - gridRect.x,
      y: ev.clientY - gridRect.y,
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
  function updateMousePosition(e: MouseEvent) {
    if (isChildEvent(gridRef.el, e)) {
      ({ x, y } = getOffsetRelativeToOverlay(e));
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
    const { x, y } = getOffsetRelativeToOverlay(e);
    const gridRect = getBoundingRectAsPOJO(gridRef.el!);

    if (y < 0 || y > gridRect.height || x < 0 || x > gridRect.width) {
      return updateMousePosition(e);
    } else {
      return pause();
    }
  }

  useRefListener(gridRef, "pointermove", updateMousePosition);
  useRefListener(gridRef, "mouseleave", onMouseLeave);
  useRefListener(gridRef, "mouseenter", resume);
  useRefListener(gridRef, "pointerdown", recompute);

  useExternalListener(window, "click", handleGlobalClick);
  function handleGlobalClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    const grid = gridRef.el!;
    if (!grid.contains(target)) {
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

interface Props {
  onCellDoubleClicked: (col: HeaderIndex, row: HeaderIndex) => void;
  onCellClicked: (
    col: HeaderIndex,
    row: HeaderIndex,
    modifiers: GridClickModifiers,
    ev: MouseEvent
  ) => void;
  onCellRightClicked: (col: HeaderIndex, row: HeaderIndex, coordinates: DOMCoordinates) => void;
  onGridResized: (dimension: Rect) => void;
  onGridMoved: (deltaX: Pixel, deltaY: Pixel) => void;
  gridOverlayDimensions: string;
}

export class GridOverlay extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GridOverlay";
  static props = {
    onCellDoubleClicked: { type: Function, optional: true },
    onCellClicked: { type: Function, optional: true },
    onCellRightClicked: { type: Function, optional: true },
    onGridResized: { type: Function, optional: true },
    onGridMoved: Function,
    gridOverlayDimensions: String,
    slots: { type: Object, optional: true },
  };
  static components = {
    FiguresContainer,
    DataValidationOverlay,
    GridAddRowsFooter,
    FilterIconsOverlay,
  };
  static defaultProps = {
    onCellDoubleClicked: () => {},
    onCellClicked: () => {},
    onCellRightClicked: () => {},
    onGridResized: () => {},
  };
  private gridOverlay: Ref<HTMLElement> = useRef("gridOverlay");
  private gridOverlayRect = useAbsoluteBoundingRect(this.gridOverlay);
  private cellPopovers!: Store<CellPopoverStore>;
  private paintFormatStore!: Store<PaintFormatStore>;

  setup() {
    useCellHovered(this.env, this.gridOverlay);
    const resizeObserver = new ResizeObserver(() => {
      const boundingRect = this.gridOverlayEl.getBoundingClientRect();
      this.props.onGridResized({
        x: boundingRect.left,
        y: boundingRect.top,
        height: this.gridOverlayEl.clientHeight,
        width: this.gridOverlayEl.clientWidth,
      });
    });
    onMounted(() => {
      resizeObserver.observe(this.gridOverlayEl);
    });
    onWillUnmount(() => {
      resizeObserver.disconnect();
    });
    this.cellPopovers = useStore(CellPopoverStore);
    this.paintFormatStore = useStore(PaintFormatStore);
  }

  get gridOverlayEl(): HTMLElement {
    if (!this.gridOverlay.el) {
      throw new Error("GridOverlay el is not defined.");
    }
    return this.gridOverlay.el;
  }

  get style() {
    return this.props.gridOverlayDimensions;
  }

  get isPaintingFormat() {
    return this.paintFormatStore.isActive;
  }

  onMouseDown(ev: MouseEvent) {
    if (ev.button > 0) {
      // not main button, probably a context menu
      return;
    }
    if (ev.target === this.gridOverlay.el && this.cellPopovers.isOpen) {
      this.cellPopovers.close();
    }
    const [col, row] = this.getCartesianCoordinates(ev);
    this.props.onCellClicked(
      col,
      row,
      {
        expandZone: ev.shiftKey,
        addZone: isCtrlKey(ev),
      },
      ev
    );
  }

  onDoubleClick(ev: MouseEvent) {
    const [col, row] = this.getCartesianCoordinates(ev);
    this.props.onCellDoubleClicked(col, row);
  }

  onContextMenu(ev: MouseEvent) {
    const [col, row] = this.getCartesianCoordinates(ev);
    this.props.onCellRightClicked(col, row, { x: ev.clientX, y: ev.clientY });
  }

  private getCartesianCoordinates(ev: MouseEvent): [HeaderIndex, HeaderIndex] {
    const x = ev.clientX - this.gridOverlayRect.x;
    const y = ev.clientY - this.gridOverlayRect.y;

    const colIndex = this.env.model.getters.getColIndex(x);
    const rowIndex = this.env.model.getters.getRowIndex(y);
    return [colIndex, rowIndex];
  }
}
