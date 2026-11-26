import { computed, signal, usePlugin } from "@odoo/owl";
import { positionToZone } from "../../helpers/zones";
import { OwlPluginWithModel } from "../../owl_plugins/owl_plugin_with_model";
import { ViewportsPlugin } from "../../owl_plugins/viewports_owl_plugin";
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
import { DelayedHoveredCellPlugin } from "../grid/delayed_hovered_cell_owl_plugin";

export class CellPopoverPlugin extends OwlPluginWithModel {
  private persistentPopover = signal<(CellPosition & { type: CellPopoverType }) | undefined>(
    undefined
  );

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
    this.persistentPopover.set({ col, row, sheetId, type });
  }

  close() {
    this.persistentPopover.set(undefined);
  }

  persistentCellPopover = computed<OpenCellPopover | ClosedCellPopover>(() => {
    const persistentPopover = this.persistentPopover();
    return persistentPopover ? { isOpen: true, ...persistentPopover } : { isOpen: false };
  });

  isOpen = computed(() => this.persistentPopover() !== undefined);

  cellPopover = computed<ClosedCellPopover | PositionedCellPopoverComponent>(() => {
    const sheetId = this.viewPlugin.displayedSheetId();

    const persistentPopover = this.persistentPopover();
    if (
      persistentPopover &&
      persistentPopover.sheetId === sheetId &&
      this.viewPlugin.viewports().isVisibleInViewport(persistentPopover)
    ) {
      const position = this.model().getters.getMainCellPosition(persistentPopover);
      const popover = cellPopoverRegistry
        .get(persistentPopover.type)
        .onOpen?.(position, this.model().getters);
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
      !this.viewPlugin.viewports().isVisibleInViewport({ sheetId, col, row })
    ) {
      return { isOpen: false };
    }
    const position = this.model().getters.getMainCellPosition({ sheetId, col, row });
    const popover = cellPopoverRegistry
      .getAll()
      .map((matcher) => matcher.onHover?.(position, this.model().getters))
      .find((popover) => popover?.isOpen);
    return !popover?.isOpen
      ? { isOpen: false }
      : {
          ...popover,
          anchorRect: this.computePopoverAnchorRect(position),
        };
  });

  private computePopoverAnchorRect({ col, row }: Position): Rect {
    const sheetId = this.viewPlugin.displayedSheetId();
    const merge = this.model().getters.getMerge({ sheetId, col, row });
    if (merge) {
      return this.viewPlugin.viewports().getVisibleRect(sheetId, merge);
    }
    return this.viewPlugin.viewports().getVisibleRect(sheetId, positionToZone({ col, row }));
  }
}
