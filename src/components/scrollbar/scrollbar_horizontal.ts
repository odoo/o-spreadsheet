import { useProps, xml } from "@odoo/owl";
import { Component } from "../../owl3_compatibility_layer";
import { useStore } from "../../store_engine/store_hooks";
import { ViewportsStore } from "../../stores/viewports_store";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { Store } from "../../types/store_engine";
import { types } from "../props_validation";
import { ScrollBar } from "./scrollbar";

export class HorizontalScrollBar extends Component<SpreadsheetChildEnv> {
  static components = { ScrollBar };
  private viewStore!: Store<ViewportsStore>;
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
    const scrollbarWidth = this.viewStore.viewports.getScrollBarWidth();
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
