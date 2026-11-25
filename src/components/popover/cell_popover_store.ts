import { usePlugin } from "@odoo/owl";
import { positionToZone } from "../../helpers/zones";
import { ViewportsPlugin } from "../../owl_plugins/viewports_owl_plugin";
import { cellPopoverRegistry } from "../../registries/cell_popovers_registry";
import { SpreadsheetStore } from "../../stores/spreadsheet_store";
import {
  CellPopoverType,
  ClosedCellPopover,
  OpenCellPopover,
  PositionedCellPopoverComponent,
} from "../../types/cell_popovers";
import { Command } from "../../types/commands";
import { CellPosition, Position } from "../../types/misc";
import { Rect } from "../../types/rendering";
import { DelayedHoveredCellPlugin } from "../grid/delayed_hovered_cell_owl_plugin";

export class CellPopoverStore extends SpreadsheetStore {
  mutators = ["open", "close"] as const;

  private persistentPopover?: CellPosition & { type: CellPopoverType };

  protected hoveredCell = usePlugin(DelayedHoveredCellPlugin);
  private viewPlugin = usePlugin(ViewportsPlugin);

  handle(cmd: Command) {
    switch (cmd.type) {
      case "ACTIVATE_SHEET":
        this.close();
    }
  }

  open({ col, row }: Position, type: CellPopoverType): void {
    const sheetId = this.viewPlugin.displayedSheetId();
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
    const sheetId = this.viewPlugin.displayedSheetId();

    if (
      this.persistentPopover &&
      this.persistentPopover.sheetId === sheetId &&
      this.viewPlugin.viewports().isVisibleInViewport(this.persistentPopover)
    ) {
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
    const hoveredPosition = this.hoveredCell.position();
    if (
      hoveredPosition === undefined ||
      hoveredPosition.sheetId !== sheetId ||
      !this.viewPlugin.viewports().isVisibleInViewport(hoveredPosition)
    ) {
      return { isOpen: false };
    }
    const position = this.getters.getMainCellPosition(hoveredPosition);
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
    const sheetId = this.viewPlugin.displayedSheetId();
    const merge = this.getters.getMerge({ sheetId, col, row });
    if (merge) {
      return this.viewPlugin.viewports().getVisibleRect(sheetId, merge);
    }
    return this.viewPlugin.viewports().getVisibleRect(sheetId, positionToZone({ col, row }));
  }
}
