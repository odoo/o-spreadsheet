import { usePlugin, useProps, xml } from "@odoo/owl";
import { ViewportsPlugin } from "../../owl_plugins/viewports_owl_plugin";
import { ZoomPlugin } from "../../owl_plugins/zoom_plugin";
import { OSComponent } from "../os_component";
import { types } from "../props_validation";
import { ScrollBar } from "./scrollbar";

export class HorizontalScrollBar extends OSComponent {
  static components = { ScrollBar };
  private viewPlugin = usePlugin(ViewportsPlugin);
  private zoomPlugin = usePlugin(ZoomPlugin);
  static template = xml/*xml*/ `
      <ScrollBar
        t-if="this.isDisplayed"
        width="this.width"
        position="this.position"
        offset="this.offset"
        direction="'horizontal'"
        onScroll.bind="this.onScroll"
      />`;

  protected props = useProps({
    leftOffset: types.number().optional(0),
  });

  get offset() {
    return this.viewPlugin.viewports().getSheetScrollInfo(this.viewPlugin.displayedSheetId())
      .scrollX;
  }

  get width() {
    return this.viewPlugin.viewports().getMainViewportRect(this.viewPlugin.displayedSheetId())
      .width;
  }

  get isDisplayed() {
    const { xRatio } = this.viewPlugin
      .viewports()
      .getFrozenSheetViewRatio(this.viewPlugin.displayedSheetId());
    return xRatio < 1;
  }

  get position() {
    const { x } = this.viewPlugin
      .viewports()
      .getMainViewportRect(this.viewPlugin.displayedSheetId());
    const scrollbarWidth = this.zoomPlugin.scrollBarWidth();
    return {
      left: `${this.props.leftOffset + x}px`,
      bottom: "0px",
      height: `${scrollbarWidth}px`,
      right: `${scrollbarWidth}px`,
    };
  }

  onScroll(offset) {
    const { scrollY } = this.viewPlugin
      .viewports()
      .getSheetScrollInfo(this.viewPlugin.displayedSheetId());
    this.viewPlugin.setViewportOffset({
      offsetX: offset,
      offsetY: scrollY, // offsetY is the same
    });
  }
}
