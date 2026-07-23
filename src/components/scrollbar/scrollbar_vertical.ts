import { useProps, xml } from "@odoo/owl";
import { Component } from "../../owl3_compatibility_layer";
import { useStore } from "../../store_engine/store_hooks";
import { ViewportsStore } from "../../stores/viewports_store";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { Store } from "../../types/store_engine";
import { types } from "../props_validation";
import { ScrollBar } from "./scrollbar";

export class VerticalScrollBar extends Component<SpreadsheetChildEnv> {
  static components = { ScrollBar };
  private viewStore!: Store<ViewportsStore>;
  static template = xml/*xml*/ `
    <ScrollBar
      t-if="this.isDisplayed"
      height="this.height"
      position="this.position"
      offset="this.offset"
      direction="'vertical'"
      onScroll.bind="(offset) => this.onScroll(offset)"
    />`;

  setup(): void {
    this.viewStore = useStore(ViewportsStore);
  }

  protected props = useProps({
    topOffset: types.number().optional(0),
  });

  get offset() {
    return this.viewStore.activeSheetScrollInfo.scrollY;
  }

  get height() {
    return this.viewStore.mainViewportRect.height;
  }

  get isDisplayed() {
    const { yRatio } = this.viewStore.viewports.getFrozenSheetViewRatio(
      this.viewStore.displayedSheetId
    );
    return yRatio < 1;
  }

  get position() {
    const { y } = this.viewStore.mainViewportRect;
    const scrollbarWidth = this.viewStore.scrollBarWidth;
    return {
      top: `${this.props.topOffset + y}px`,
      right: "0px",
      width: `${scrollbarWidth}px`,
      bottom: `${scrollbarWidth}px`,
    };
  }

  onScroll(offset) {
    const { scrollX } = this.viewStore.activeSheetScrollInfo;
    this.viewStore.setViewportOffset({ offsetX: scrollX, offsetY: offset });
  }
}
