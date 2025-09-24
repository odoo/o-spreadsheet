import { Component, xml } from "@odoo/owl";
import { SCROLLBAR_WIDTH } from "../../constants";
import { SpreadsheetChildEnv } from "../../types";
import { isBrowserFirefox } from "../helpers/dom_helpers";
import { ScrollBar } from "./scrollbar";

interface Props {
  leftOffset: number;
}

export class HorizontalScrollBar extends Component<Props, SpreadsheetChildEnv> {
  static props = {
    leftOffset: { type: Number, optional: true },
  };
  static components = { ScrollBar };
  static template = xml/*xml*/ `
      <ScrollBar
        t-if="isDisplayed"
        width="width"
        position="position"
        offset="offset"
        direction="'horizontal'"
        onScroll.bind="onScroll"
      />`;
  static defaultProps = {
    leftOffset: 0,
  };

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
    return {
      left: `${this.props.leftOffset + x}px`,
      bottom: "0px",
      height: `${SCROLLBAR_WIDTH}px`,
      right: isBrowserFirefox() ? `${SCROLLBAR_WIDTH}px` : "0",
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
