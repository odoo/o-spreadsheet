import { usePlugin, useProps } from "@odoo/owl";
import { ZoomPlugin } from "../../owl_plugins/zoom_plugin";
import { useStore } from "../../store_engine/store_hooks";
import { ClosedCellPopover, PositionedCellPopoverComponent } from "../../types/cell_popovers";
import { Store } from "../../types/store_engine";
import { OSComponent } from "../os_component";
import { CellPopoverStore } from "../popover/cell_popover_store";
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
  protected cellPopovers!: Store<CellPopoverStore>;
  private zoomPlugin = usePlugin(ZoomPlugin);

  setup() {
    this.cellPopovers = useStore(CellPopoverStore);
  }

  get cellPopover(): PositionedCellPopoverComponent | ClosedCellPopover {
    const popover = this.cellPopovers.cellPopover;
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
