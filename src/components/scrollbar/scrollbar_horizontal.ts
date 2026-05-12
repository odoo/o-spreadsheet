import { props, xml } from "@odoo/owl";
import { Component } from "../../owl3_compatibility_layer";
import { PixelOffset } from "../../types/misc";
import { SpreadsheetRenderingEnv } from "../../types/spreadsheet_env";
import { types } from "../props_validation";
import { ScrollBar } from "./scrollbar";

export class HorizontalScrollBar extends Component<SpreadsheetRenderingEnv> {
  static components = { ScrollBar };
  static template = xml/*xml*/ `
      <ScrollBar
        t-if="this.isDisplayed"
        width="this.width"
        position="this.position"
        offset="this.offset"
        direction="'horizontal'"
        onScroll.bind="this.onScroll"
      />`;

  protected props = props({
    leftOffset: types.number().optional(0),
    // FIXME CAROUSELS: this props should be gone when the viewports are transformed into stores
    onScroll: types.function<(offset: PixelOffset) => void>(),
  });

  get offset() {
    return this.env.viewports.getSheetScrollInfo(this.env.sheetId).scrollX;
  }

  get width() {
    return this.env.viewports.getMainViewportRect(this.env.sheetId).width;
  }

  get isDisplayed() {
    const { xRatio } = this.env.viewports.getFrozenSheetViewRatio(this.env.sheetId);
    return xRatio < 1;
  }

  get position() {
    const { x } = this.env.viewports.getMainViewportRect(this.env.sheetId);
    const scrollbarWidth = this.env.viewports.getScrollBarWidth();
    return {
      left: `${this.props.leftOffset + x}px`,
      bottom: "0px",
      height: `${scrollbarWidth}px`,
      right: `${scrollbarWidth}px`,
    };
  }

  onScroll(offset) {
    const { scrollY } = this.env.viewports.getSheetScrollInfo(this.env.sheetId);
    this.props.onScroll({
      offsetX: offset,
      offsetY: scrollY, // offsetY is the same
    });
  }
}
