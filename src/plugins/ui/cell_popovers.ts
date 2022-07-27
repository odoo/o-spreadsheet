import { positionToZone } from "../../helpers";
import { Mode } from "../../model";
import { cellPopoverRegistry } from "../../registries/cell_popovers_registry";
import { Command, CommandResult, DOMCoordinates, Position } from "../../types";
import {
  CellPopoverType,
  ClosedCellPopover,
  PositionedCellPopover,
} from "../../types/cell_popovers";
import { UIPlugin } from "../ui_plugin";

/**
 * Plugin managing the display of components next to cells.
 */
export class CellPopoverPlugin extends UIPlugin {
  static getters = ["getCellPopover"] as const;
  static modes: Mode[] = ["normal"];

  private persistentPopover?: Position & { type: CellPopoverType };

  allowDispatch(cmd: Command) {
    switch (cmd.type) {
      case "OPEN_CELL_POPOVER":
        try {
          cellPopoverRegistry.get(cmd.popoverType);
        } catch (error) {
          return CommandResult.InvalidCellPopover;
        }
        return CommandResult.Success;
      default:
        return CommandResult.Success;
    }
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "ACTIVATE_SHEET":
        this.persistentPopover = undefined;
        break;
      case "OPEN_CELL_POPOVER":
        this.persistentPopover = {
          col: cmd.col,
          row: cmd.row,
          type: cmd.popoverType,
        };
        break;
      case "CLOSE_CELL_POPOVER":
        this.persistentPopover = undefined;
        break;
    }
  }

  getCellPopover({ col, row }: Partial<Position>): ClosedCellPopover | PositionedCellPopover {
    const sheetId = this.getters.getActiveSheetId();
    const viewport = this.getters.getActiveViewport();

    if (
      this.persistentPopover &&
      this.getters.isVisibleInViewport(
        this.persistentPopover.col,
        this.persistentPopover.row,
        viewport
      )
    ) {
      const mainPosition = this.getters.getMainCellPosition(
        sheetId,
        this.persistentPopover.col,
        this.persistentPopover.row
      );
      const popover = cellPopoverRegistry
        .get(this.persistentPopover.type)
        .onOpen?.(mainPosition, this.getters);
      return !popover?.isOpen
        ? { isOpen: false }
        : {
            ...popover,
            ...this.computePopoverProps(this.persistentPopover, popover.cellCorner),
          };
    }
    if (
      col === undefined ||
      row === undefined ||
      !this.getters.isVisibleInViewport(col, row, viewport)
    ) {
      return { isOpen: false };
    }
    const mainPosition = this.getters.getMainCellPosition(sheetId, col, row);
    const popover = cellPopoverRegistry
      .getAll()
      .map((matcher) => matcher.onHover?.(mainPosition, this.getters))
      .find((popover) => popover?.isOpen);
    return !popover?.isOpen
      ? { isOpen: false }
      : {
          ...popover,
          ...this.computePopoverProps(mainPosition, popover.cellCorner),
        };
  }

  private computePopoverProps({ col, row }: Position, corner: "TopRight" | "BottomLeft") {
    const viewport = this.getters.getActiveViewport();
    const { width, height } = this.getters.getRect(positionToZone({ col, row }), viewport);
    return {
      coordinates: this.computePopoverPosition({ col, row }, corner),
      cellWidth: -width,
      cellHeight: -height,
    };
  }

  private computePopoverPosition(
    { col, row }: Position,
    corner: "TopRight" | "BottomLeft"
  ): DOMCoordinates {
    const sheetId = this.getters.getActiveSheetId();
    const viewport = this.getters.getActiveViewport();
    const merge = this.getters.getMerge(sheetId, col, row);
    if (merge) {
      col = corner === "TopRight" ? merge.right : merge.left;
      row = corner === "TopRight" ? merge.top : merge.bottom;
    }
    // x, y are relative to the canvas
    const { x, y, width, height } = this.getters.getRect(positionToZone({ col, row }), viewport);
    switch (corner) {
      case "BottomLeft":
        return { x, y: y + height };
      case "TopRight":
        return { x: x + width, y: y };
    }
  }
}
