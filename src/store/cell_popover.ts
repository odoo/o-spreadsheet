import { positionToZone } from "../helpers";
import { cellPopoverRegistry } from "../registries/cell_popovers_registry";
import { CellPosition, Command, Position, Rect } from "../types";
import {
  CellPopoverType,
  ClosedCellPopover,
  OpenCellPopover,
  PositionedCellPopover,
} from "../types/cell_popovers";
import { HoveredCell } from "./hovered_cell";
import { ModelStore } from "./model_store";
import { Store } from "./store";

export class CellPopover extends Store {
  private persistentPopover?: CellPosition & { type: CellPopoverType };
  private hoveredCell = this.get(HoveredCell);
  private model = this.get(ModelStore);
  private getters = this.get(ModelStore).getters;

  constructor(get) {
    super(get);
    this.model.on("command-dispatched", this, (cmd: Command) => {
      switch (cmd.type) {
        case "ACTIVATE_SHEET":
          this.close();
      }
    });
  }

  open({ col, row }: Position, type: CellPopoverType): void {
    const sheetId = this.getters.getActiveSheetId();
    if (!cellPopoverRegistry.contains(type)) {
      return;
    }
    this.persistentPopover = {
      col,
      row,
      sheetId,
      type,
    };
  }

  close() {
    this.persistentPopover = undefined;
  }

  get isOpen() {
    return this.persistentPopover !== undefined;
  }

  get cellPersistentPopover(): OpenCellPopover | ClosedCellPopover {
    if (this.persistentPopover) {
      return {
        isOpen: true,
        ...this.persistentPopover,
      };
    }
    return { isOpen: false };
  }

  get cellPopoverComponent(): ClosedCellPopover | PositionedCellPopover {
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
