import { props, xml } from "@odoo/owl";
import { Component } from "../../owl3_compatibility_layer";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { types } from "../props_validation";
import { ScrollBar } from "./scrollbar";

export class HorizontalScrollBar extends Component<SpreadsheetChildEnv> {
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

  protected props = props(
    {
      "leftOffset?": types.number(),
    },
    {
      leftOffset: 0,
    }
  );

  get offset() {
    return this.env.model.getters.getActiveSheetScrollInfo().scrollX;
  }

  get width() {
    return this.env.model.getters.getMainViewportRect().width;
  }

  get isDisplayed() {
    const { xRatio } = this.env.model.getters.getFrozenSheetViewRatio(
      this.env.model.getters.getActiveSheetId()
    );
    return xRatio < 1;
  }

  get position() {
    const { x } = this.env.model.getters.getMainViewportRect();
    const scrollbarWidth = this.env.model.getters.getScrollBarWidth();
    return {
      left: `${this.props.leftOffset + x}px`,
      bottom: "0px",
      height: `${scrollbarWidth}px`,
      right: `${scrollbarWidth}px`,
    };
  }

  onScroll(offset) {
    const { scrollY } = this.env.model.getters.getActiveSheetScrollInfo();
    this.env.model.dispatch("SET_VIEWPORT_OFFSET", {
      offsetX: offset,
      offsetY: scrollY, // offsetY is the same
    });
  }
}
