import { plugin, signal } from "@odoo/owl";
import { positionToZone } from "../../helpers/zones";
import { cellPopoverRegistry } from "../../registries/cell_popovers_registry";
import {
  CellPopoverType,
  ClosedCellPopover,
  OpenCellPopover,
  PositionedCellPopoverComponent,
} from "../../types/cell_popovers";
import { Command } from "../../types/commands";
import { CellPosition, Position } from "../../types/misc";
import { Rect } from "../../types/rendering";
import { DelayedHoveredCellPlugin } from "./delayed_hovered_cell_plugin";
import { SpreadsheetOwlPlugin } from "./spreadsheet_owl_plugin";

export class CellPopoverPlugin extends SpreadsheetOwlPlugin {
  private persistentPopover = signal<(CellPosition & { type: CellPopoverType }) | undefined>(
    undefined
  );

  protected hoveredCell = plugin(DelayedHoveredCellPlugin);

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
    this.persistentPopover.set({ col, row, sheetId, type });
  }

  close() {
    this.persistentPopover.set(undefined);
  }

  get persistentCellPopover(): OpenCellPopover | ClosedCellPopover {
    const popover = this.persistentPopover();
    return (popover && { isOpen: true, ...popover }) || { isOpen: false };
  }

  get isOpen() {
    return this.persistentPopover() !== undefined;
  }

  get cellPopover(): ClosedCellPopover | PositionedCellPopoverComponent {
    const sheetId = this.getters.getActiveSheetId();
    const persistentPopover = this.persistentPopover();

    if (persistentPopover && this.getters.isVisibleInViewport(persistentPopover)) {
      const position = this.getters.getMainCellPosition(persistentPopover);
      const popover = cellPopoverRegistry
        .get(persistentPopover.type)
        .onOpen?.(position, this.getters);
      return !popover?.isOpen
        ? { isOpen: false }
        : {
            ...popover,
            anchorRect: this.computePopoverAnchorRect(persistentPopover),
          };
    }
    const col = this.hoveredCell.col();
    const row = this.hoveredCell.row();
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
