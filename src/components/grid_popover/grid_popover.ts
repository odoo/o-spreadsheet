import { useStore } from "../../store_engine/store_hooks";
import { ClosedCellPopover, PositionedCellPopoverComponent } from "../../types/cell_popovers";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { Store } from "../../types/store_engine";
import { getZoomedRect } from "../helpers/zoom";
import { CellPopoverStore } from "../popover/cell_popover_store";
import { Popover } from "../popover/popover";
import { types } from "../props_validation";

import { props } from "@odoo/owl";
import { Component } from "../../owl3_compatibility_layer";

export class GridPopover extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GridPopover";
  static components = { Popover };

  protected props = props({
    onClosePopover: types.function([]),
    onMouseWheel: types.function<[ev: WheelEvent]>([types.instanceOf(WheelEvent)]),
    gridRect: types.Rect(),
  });
  protected cellPopovers!: Store<CellPopoverStore>;

  setup() {
    this.cellPopovers = useStore(CellPopoverStore);
  }

  get cellPopover(): PositionedCellPopoverComponent | ClosedCellPopover {
    const popover = this.cellPopovers.cellPopover;
    if (!popover.isOpen) {
      return { isOpen: false };
    }
    const zoom = this.env.model.getters.getViewportZoomLevel();
    const anchorRect = getZoomedRect(zoom, popover.anchorRect);
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
