import { usePlugin, useProps } from "@odoo/owl";
import { ZoomPlugin } from "../../owl_plugins/zoom_plugin";
import { ClosedCellPopover, PositionedCellPopoverComponent } from "../../types/cell_popovers";
import { OSComponent } from "../os_component";
import { CellPopoverPlugin } from "../popover/cell_popover_owl_plugin";
import { Popover } from "../popover/popover";
import { types } from "../props_validation";

export class GridPopover extends OSComponent {
  static template = "o-spreadsheet-GridPopover";
  static components = { Popover };

  protected props = useProps({
    onClosePopover: types.function(),
    onMouseWheel: types.function<(ev: WheelEvent) => void>(),
    gridRect: types.Rect(),
  });
  private cellPopovers = usePlugin(CellPopoverPlugin);
  private zoomPlugin = usePlugin(ZoomPlugin);

  get cellPopover(): PositionedCellPopoverComponent | ClosedCellPopover {
    const popover = this.cellPopovers.cellPopover();
    if (!popover.isOpen) {
      return { isOpen: false };
    }
    const anchorRect = this.zoomPlugin.getZoomedRect(popover.anchorRect);
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
