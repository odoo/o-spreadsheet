import { useProps, xml } from "@odoo/owl";
import { useStore } from "../../store_engine/store_hooks";
import { ViewportsStore } from "../../stores/viewports_store";
import { ZoomStore } from "../../stores/zoom_store";
import { Store } from "../../types/store_engine";
import { types } from "../props_validation";
import { SpreadsheetComponent } from "../spreadsheet/spreadsheet_component";
import { ScrollBar } from "./scrollbar";

export class HorizontalScrollBar extends SpreadsheetComponent {
  static components = { ScrollBar };
  private viewStore!: Store<ViewportsStore>;
  private zoomStore!: Store<ZoomStore>;
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
    this.zoomStore = useStore(ZoomStore);
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
    const scrollbarWidth = this.zoomStore.scrollBarWidth;
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
