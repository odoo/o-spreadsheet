import { Component } from "@odoo/owl";
import { ComponentsImportance } from "../../constants";
import { Store } from "../../store_engine/store";
import { useStore } from "../../store_engine/store_hooks";
import { Rect, SpreadsheetChildEnv } from "../../types";
import { ClosedCellPopover, PositionedCellPopoverComponent } from "../../types/cell_popovers";
import { CellPopoverStore } from "../popover";
import { Popover } from "../popover/popover";

interface Props {
  gridRect: Rect;
  onClosePopover: () => void;
  onMouseWheel: (ev: WheelEvent) => void;
}
export class GridPopover extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GridPopover";
  static props = {
    onClosePopover: Function,
    onMouseWheel: Function,
    gridRect: Object,
  };
  static components = { Popover };
  protected cellPopovers!: Store<CellPopoverStore>;
  zIndex = ComponentsImportance.GridPopover;

  setup() {
    this.cellPopovers = useStore(CellPopoverStore);
  }

  get cellPopover(): PositionedCellPopoverComponent | ClosedCellPopover {
    const popover = this.cellPopovers.cellPopover;
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
