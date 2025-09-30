import { CellPosition, Position } from "@odoo/o-spreadsheet-engine";
import { positionToZone } from "../../helpers";
import { cellPopoverRegistry } from "../../registries/cell_popovers_registry";
import { SpreadsheetStore } from "../../stores";
import { Command, Rect } from "../../types";
import {
  CellPopoverType,
  ClosedCellPopover,
  OpenCellPopover,
  PositionedCellPopoverComponent,
} from "../../types/cell_popovers";
import { DelayedHoveredCellStore } from "../grid/delayed_hovered_cell_store";

export class CellPopoverStore extends SpreadsheetStore {
  mutators = ["open", "close"] as const;

  private persistentPopover?: CellPosition & { type: CellPopoverType };

  protected hoveredCell = this.get(DelayedHoveredCellStore);

  handle(cmd: Command) {
    switch (cmd.type) {
      case "ACTIVATE_SHEET":
        this.close();
    }
  }

  open({ col, row }: Position, type: CellPopoverType): void {
    const sheetId = this.getters.getActiveSheetId();
    if (!cellPopoverRegistry.contains(type)) {
      return;
    }
    this.persistentPopover = { col, row, sheetId, type };
  }

  close() {
    if (!this.persistentPopover) {
      return "noStateChange";
    }
    this.persistentPopover = undefined;
    return;
  }

  get persistentCellPopover(): OpenCellPopover | ClosedCellPopover {
    return (
      (this.persistentPopover && { isOpen: true, ...this.persistentPopover }) || { isOpen: false }
    );
  }

  get isOpen() {
    return this.persistentPopover !== undefined;
  }

  get cellPopover(): ClosedCellPopover | PositionedCellPopoverComponent {
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
    const { col, row } = this.hoveredCell;
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

  private computePopoverAnchorRect({ col, row }: Position): Rect {
    const sheetId = this.getters.getActiveSheetId();
    const merge = this.getters.getMerge({ sheetId, col, row });
    if (merge) {
      return this.getters.getVisibleRect(merge);
    }
    return this.getters.getVisibleRect(positionToZone({ col, row }));
  }
}
