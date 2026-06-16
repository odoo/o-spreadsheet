import { ClosedCellPopover, PositionedCellPopoverComponent } from "../../types/cell_popovers";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { getZoomedRect } from "../helpers/zoom";
import { Popover } from "../popover/popover";
import { types } from "../props_validation";

import { plugin, props } from "@odoo/owl";
import { Component } from "../../owl3_compatibility_layer";
import { CellPopoverPlugin } from "../owl_plugins/cell_popover_plugin";

export class GridPopover extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GridPopover";
  static components = { Popover };

  protected props = props({
    onClosePopover: types.function(),
    onMouseWheel: types.function<(ev: WheelEvent) => void>(),
    gridRect: types.Rect(),
  });
  protected cellPopovers = plugin(CellPopoverPlugin);

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
