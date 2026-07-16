import { props, xml } from "@odoo/owl";
import { Component } from "../../owl3_compatibility_layer";
import { useStore } from "../../store_engine/store_hooks";
import { ViewportsStore } from "../../stores/viewports_store";
import { SpreadsheetRenderingEnv } from "../../types/spreadsheet_env";
import { Store } from "../../types/store_engine";
import { types } from "../props_validation";
import { ScrollBar } from "./scrollbar";

export class HorizontalScrollBar extends Component<SpreadsheetRenderingEnv> {
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

  protected props = props({
    leftOffset: types.number().optional(0),
  });

  get offset() {
    return this.viewStore.viewports.getSheetScrollInfo(this.env.sheetId).scrollX;
  }

  get width() {
    return this.viewStore.viewports.getMainViewportRect(this.env.sheetId).width;
  }

  get isDisplayed() {
    const { xRatio } = this.viewStore.viewports.getFrozenSheetViewRatio(this.env.sheetId);
    return xRatio < 1;
  }

  get position() {
    const { x } = this.viewStore.viewports.getMainViewportRect(this.env.sheetId);
    const scrollbarWidth = this.viewStore.viewports.getScrollBarWidth();
    return {
      left: `${this.props.leftOffset + x}px`,
      bottom: "0px",
      height: `${scrollbarWidth}px`,
      right: `${scrollbarWidth}px`,
    };
  }

  onScroll(offset) {
    const { scrollY } = this.viewStore.viewports.getSheetScrollInfo(this.env.sheetId);
    this.viewStore.setViewportOffset({
      offsetX: offset,
      offsetY: scrollY, // offsetY is the same
    });
  }
}
