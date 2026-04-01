import { Component, xml } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { cssPropertiesToCss } from "../helpers";
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
  <div class="o-scrollbar-container position-absolute" t-att-style="containerStyle">
      <ScrollBar
        t-if="isDisplayed"
        width="width"
        position="position"
        offset="offset"
        direction="'horizontal'"
        onScroll.bind="onScroll"
      />
  </div>`;
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

  get containerStyle() {
    const scrollbarWidth = this.env.model.getters.getScrollBarWidth();
    return cssPropertiesToCss({
      left: `${this.props.leftOffset}px`,
      bottom: "0px",
      height: `${scrollbarWidth}px`,
      right: isBrowserFirefox() ? `${scrollbarWidth}px` : "0",
    });
  }

  get position() {
    const { x } = this.env.model.getters.getMainViewportRect();
    const scrollbarWidth = this.env.model.getters.getScrollBarWidth();
    return {
      left: `${x}px`,
      height: `${scrollbarWidth}px`,
      right: isBrowserFirefox() ? `${scrollbarWidth}px` : "0",
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
