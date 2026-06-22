import { props, xml } from "@odoo/owl";
import { Component } from "../../owl3_compatibility_layer";
import { PixelOffset } from "../../types/misc";
import { SpreadsheetRenderingEnv } from "../../types/spreadsheet_env";
import { types } from "../props_validation";
import { ScrollBar } from "./scrollbar";

export class VerticalScrollBar extends Component<SpreadsheetRenderingEnv> {
  static components = { ScrollBar };
  static template = xml/*xml*/ `
    <ScrollBar
      t-if="this.isDisplayed"
      height="this.height"
      position="this.position"
      offset="this.offset"
      direction="'vertical'"
      onScroll.bind="(offset) => this.onScroll(offset)"
    />`;

  protected props = props({
    topOffset: types.number().optional(0),
    // FIXME CAROUSELS: this props should be gone when the viewports are transformed into stores
    onScroll: types.function<(offset: PixelOffset) => void>(),
    hasFooter: types.boolean().optional(true),
  });

  get offset() {
    return this.env.viewports.getSheetScrollInfo(this.env.sheetId).scrollY;
  }

  get height() {
    return this.env.viewports.getMainViewportRect(this.env.sheetId).height;
  }

  get isDisplayed() {
    const { yRatio } = this.env.viewports.getFrozenSheetViewRatio(this.env.sheetId);
    return yRatio < 1;
  }

  get position() {
    const { y } = this.env.viewports.getMainViewportRect(this.env.sheetId);
    const scrollbarWidth = this.env.viewports.getScrollBarWidth();
    return {
      top: `${this.props.topOffset + y}px`,
      right: "0px",
      width: `${scrollbarWidth}px`,
      bottom: this.props.hasFooter ? `${scrollbarWidth}px` : "0px",
    };
  }

  onScroll(offset) {
    const { scrollX } = this.env.viewports.getSheetScrollInfo(this.env.sheetId);
    this.props.onScroll({
      offsetX: scrollX, // offsetX is the same
      offsetY: offset,
    });
  }
}
