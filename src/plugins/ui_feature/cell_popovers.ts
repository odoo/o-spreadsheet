import { positionToZone } from "../../helpers";
import { cellPopoverRegistry } from "../../registries/cell_popovers_registry";
import { CellPosition, Command, CommandResult, DOMCoordinates, Position } from "../../types";
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
  static getters = ["getCellPopover", "getPersistentPopoverTypeAtPosition"] as const;

  private persistentPopover?: CellPosition & { type: CellPopoverType };

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
          sheetId: this.getters.getActiveSheetId(),
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

    if (this.persistentPopover && this.getters.isVisibleInViewport(this.persistentPopover)) {
      const position = this.getters.getMainCellPosition(this.persistentPopover);
      const popover = cellPopoverRegistry
        .get(this.persistentPopover.type)
        .onOpen?.(position, this.getters);
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
      !this.getters.isVisibleInViewport({ sheetId, col, row })
    ) {
      return { isOpen: false };
    }
    const position = this.getters.getMainCellPosition({ sheetId, col, row });
    const popover = cellPopoverRegistry
      .getAll()
      .map((matcher) => matcher.onHover?.(position, this.getters))
      .find((popover) => popover?.isOpen);
    return !popover?.isOpen
      ? { isOpen: false }
      : {
          ...popover,
          ...this.computePopoverProps(position, popover.cellCorner),
        };
  }

  getPersistentPopoverTypeAtPosition({ col, row }: Position): CellPopoverType | undefined {
    if (
      this.persistentPopover &&
      this.persistentPopover.col === col &&
      this.persistentPopover.row === row
    ) {
      return this.persistentPopover.type;
    }
    return undefined;
  }

  private computePopoverProps({ col, row }: Position, corner: "TopRight" | "BottomLeft") {
    const { width, height } = this.getters.getVisibleRect(positionToZone({ col, row }));
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
    const merge = this.getters.getMerge({ sheetId, col, row });
    if (merge) {
      col = corner === "TopRight" ? merge.right : merge.left;
      row = corner === "TopRight" ? merge.top : merge.bottom;
    }
    // x, y are relative to the canvas
    const { x, y, width, height } = this.getters.getVisibleRect(positionToZone({ col, row }));
    switch (corner) {
      case "BottomLeft":
        return { x, y: y + height };
      case "TopRight":
        return { x: x + width, y: y };
    }
  }
}
