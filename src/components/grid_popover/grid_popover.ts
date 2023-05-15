import { Component } from "@odoo/owl";
import { cellPopoverRegistry } from "../../registries";
import { CellPopover } from "../../store/cell_popover";
import { CQS } from "../../store/dependency_container";
import { useStore } from "../../store/hooks";
import { Rect, SpreadsheetChildEnv } from "../../types";
import { ClosedCellPopover, PositionedCellPopover } from "../../types/cell_popovers";
import { ErrorToolTipPopoverBuilder } from "../error_tooltip/error_tooltip";
import { FilterMenuPopoverBuilder } from "../filters/filter_menu/filter_menu";
import { LinkCellPopoverBuilder, LinkEditorPopoverBuilder } from "../link";
import { Popover } from "../popover/popover";

cellPopoverRegistry
  .add("ErrorToolTip", ErrorToolTipPopoverBuilder)
  .add("FilterMenu", FilterMenuPopoverBuilder)
  .add("LinkEditor", LinkEditorPopoverBuilder)
  .add("LinkCell", LinkCellPopoverBuilder);

interface Props {
  gridRect: Rect;
  onClosePopover: () => void;
  onMouseWheel: (ev: WheelEvent) => void;
}
export class GridPopover extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GridPopover";
  static components = { Popover };
  private cellPopoverStore!: CQS<CellPopover>;

  setup() {
    this.cellPopoverStore = useStore(CellPopover);
  }

  get cellPopover(): PositionedCellPopover | ClosedCellPopover {
    const popover = this.cellPopoverStore.cellPopoverComponent;
    if (!popover.isOpen) {
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
  onClosePopover: Function,
  onMouseWheel: Function,
  gridRect: Object,
};
