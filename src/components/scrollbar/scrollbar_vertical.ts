import { usePlugin, useProps, xml } from "@odoo/owl";
import { ViewportsPlugin } from "../../owl_plugins/viewports_owl_plugin";
import { ZoomPlugin } from "../../owl_plugins/zoom_plugin";
import { OSComponent } from "../os_component";
import { types } from "../props_validation";
import { ScrollBar } from "./scrollbar";

export class VerticalScrollBar extends OSComponent {
  static components = { ScrollBar };
  private viewPlugin = usePlugin(ViewportsPlugin);
  private zoomPlugin = usePlugin(ZoomPlugin);
  static template = xml/*xml*/ `
    <ScrollBar
      t-if="this.isDisplayed"
      height="this.height"
      position="this.position"
      offset="this.offset"
      direction="'vertical'"
      onScroll.bind="(offset) => this.onScroll(offset)"
    />`;

  protected props = useProps({
    topOffset: types.number().optional(0),
    hasFooter: types.boolean().optional(true),
  });

  get offset() {
    return this.viewPlugin.viewports().getSheetScrollInfo(this.viewPlugin.displayedSheetId())
      .scrollY;
  }

  get height() {
    return this.viewPlugin.viewports().getMainViewportRect(this.viewPlugin.displayedSheetId())
      .height;
  }

  get isDisplayed() {
    const { yRatio } = this.viewPlugin
      .viewports()
      .getFrozenSheetViewRatio(this.viewPlugin.displayedSheetId());
    return yRatio < 1;
  }

  get position() {
    const { y } = this.viewPlugin
      .viewports()
      .getMainViewportRect(this.viewPlugin.displayedSheetId());
    const scrollbarWidth = this.zoomPlugin.scrollBarWidth();
    return {
      top: `${this.props.topOffset + y}px`,
      right: "0px",
      width: `${scrollbarWidth}px`,
      bottom: this.props.hasFooter ? `${scrollbarWidth}px` : "0px",
    };
  }

  onScroll(offset) {
    const { scrollX } = this.viewPlugin
      .viewports()
      .getSheetScrollInfo(this.viewPlugin.displayedSheetId());
    this.viewPlugin.setViewportOffset({
      offsetX: scrollX, // offsetX is the same
      offsetY: offset,
    });
  }
}
