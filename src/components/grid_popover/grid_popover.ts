import { Component, onPatched, useState } from "@odoo/owl";
import { MenuService } from "../../helpers/menu_service";
import { Position, Rect, SpreadsheetChildEnv } from "../../types";
import { ClosedCellPopover, PositionedCellPopover } from "../../types/cell_popovers";
import { Popover } from "../popover/popover";

interface Props {
  hoveredCell: Partial<Position>;
  gridRect: Rect;
  onClosePopover: () => void;
  onMouseWheel: (ev: WheelEvent) => void;
}

export class GridPopover extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GridPopover";
  static components = { Popover };

  menuService = useState<MenuService>(this.env.menuService);
  private wasMenuOpen = this.menuService.hasOpenMenu();

  setup() {
    onPatched(() => {
      const isMenuOpen = this.menuService.hasOpenMenu();
      const hasPersistentPopover = this.env.model.getters.hasOpenedPopover();
      if (isMenuOpen && hasPersistentPopover) {
        if (!this.wasMenuOpen) {
          this.env.model.dispatch("CLOSE_CELL_POPOVER");
        } else {
          this.menuService.closeActiveMenu();
        }
      }
      this.wasMenuOpen = isMenuOpen;
    });
  }

  get cellPopover(): PositionedCellPopover | ClosedCellPopover {
    const popover = this.env.model.getters.getCellPopover(this.props.hoveredCell);
    if (!popover.isOpen || this.menuService.hasOpenMenu()) {
      return { isOpen: false };
    }
    const anchorRect = popover.anchorRect;
    return {
      ...popover,
      // transform from the "canvas coordinate system" to the "body coordinate system"
      anchorRect: {
        ...anchorRect,
        x: anchorRect.x + this.props.gridRect.x,
        y: anchorRect.y + this.props.gridRect.y,
      },
    };
  }
}

GridPopover.props = {
  hoveredCell: Object,
  onClosePopover: Function,
  onMouseWheel: Function,
  gridRect: Object,
};
