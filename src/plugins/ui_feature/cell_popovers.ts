import { positionToZone } from "../../helpers";
import { cellPopoverRegistry } from "../../registries/cell_popovers_registry";
import type { CellPosition, Command, LocalCommand, Position, Rect } from "../../types";
import { CommandResult } from "../../types";
import type {
  CellPopoverType,
  ClosedCellPopover,
  PositionedCellPopover,
} from "../../types/cell_popovers";
import { UIPlugin } from "../ui_plugin";

/**
 * Plugin managing the display of components next to cells.
 */
export class CellPopoverPlugin extends UIPlugin {
  static getters = [
    "getCellPopover",
    "getPersistentPopoverTypeAtPosition",
    "hasOpenedPopover",
  ] as const;

  private persistentPopover?: CellPosition & { type: CellPopoverType };

  allowDispatch(cmd: LocalCommand): CommandResult {
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
            anchorRect: this.computePopoverAnchorRect(this.persistentPopover),
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
          anchorRect: this.computePopoverAnchorRect(position),
        };
  }

  hasOpenedPopover() {
    return this.persistentPopover !== undefined;
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

  private computePopoverAnchorRect({ col, row }: Position): Rect {
    const sheetId = this.getters.getActiveSheetId();
    const merge = this.getters.getMerge({ sheetId, col, row });
    if (merge) {
      return this.getters.getVisibleRect(merge);
    }
    return this.getters.getVisibleRect(positionToZone({ col, row }));
  }
}
