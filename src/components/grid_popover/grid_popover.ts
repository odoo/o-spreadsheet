import { useStore } from "../../store_engine/store_hooks";
import { ZoomStore } from "../../stores/zoom_store";
import { ClosedCellPopover, PositionedCellPopoverComponent } from "../../types/cell_popovers";
import { SpreadsheetComponentEnv } from "../../types/spreadsheet_env";
import { Store } from "../../types/store_engine";
import { CellPopoverStore } from "../popover/cell_popover_store";
import { Popover } from "../popover/popover";
import { types } from "../props_validation";

import { useProps } from "@odoo/owl";
import { Component } from "../../owl3_compatibility_layer";

export class GridPopover extends Component<SpreadsheetComponentEnv> {
  static template = "o-spreadsheet-GridPopover";
  static components = { Popover };

  protected props = useProps({
    onClosePopover: types.function(),
    onMouseWheel: types.function<(ev: WheelEvent) => void>(),
    gridRect: types.Rect(),
  });
  protected cellPopovers!: Store<CellPopoverStore>;
  private zoomStore!: Store<ZoomStore>;

  setup() {
    this.cellPopovers = useStore(CellPopoverStore);
    this.zoomStore = useStore(ZoomStore);
  }

  get cellPopover(): PositionedCellPopoverComponent | ClosedCellPopover {
    const popover = this.cellPopovers.cellPopover;
    if (!popover.isOpen) {
      return { isOpen: false };
    }
    const anchorRect = this.zoomStore.getZoomedRect(popover.anchorRect);
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
