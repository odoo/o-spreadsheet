import { usePlugin, useProps, xml } from "@odoo/owl";
import { ZoomPlugin } from "../../owl_plugins/zoom_plugin";
import { useStore } from "../../store_engine/store_hooks";
import { ViewportsStore } from "../../stores/viewports_store";
import { Store } from "../../types/store_engine";
import { OSComponent } from "../os_component";
import { types } from "../props_validation";
import { ScrollBar } from "./scrollbar";

export class HorizontalScrollBar extends OSComponent {
  static components = { ScrollBar };
  private viewStore!: Store<ViewportsStore>;
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

  setup(): void {
    this.viewStore = useStore(ViewportsStore);
  }

  protected props = useProps({
    leftOffset: types.number().optional(0),
  });

  get offset() {
    return this.viewStore.viewports.getSheetScrollInfo(this.viewStore.displayedSheetId).scrollX;
  }

  get width() {
    return this.viewStore.viewports.getMainViewportRect(this.viewStore.displayedSheetId).width;
  }

  get isDisplayed() {
    const { xRatio } = this.viewStore.viewports.getFrozenSheetViewRatio(
      this.viewStore.displayedSheetId
    );
    return xRatio < 1;
  }

  get position() {
    const { x } = this.viewStore.viewports.getMainViewportRect(this.viewStore.displayedSheetId);
    const scrollbarWidth = this.zoomPlugin.scrollBarWidth();
    return {
      left: `${this.props.leftOffset + x}px`,
      bottom: "0px",
      height: `${scrollbarWidth}px`,
      right: `${scrollbarWidth}px`,
    };
  }

  onScroll(offset) {
    const { scrollY } = this.viewStore.viewports.getSheetScrollInfo(
      this.viewStore.displayedSheetId
    );
    this.viewStore.setViewportOffset({
      offsetX: offset,
      offsetY: scrollY, // offsetY is the same
    });
  }
}
