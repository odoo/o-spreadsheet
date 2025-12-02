import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, xml } from "@odoo/owl";
import { isBrowserFirefox } from "../helpers/dom_helpers";
import { ScrollBar } from "./scrollbar";

interface Props {
  topOffset: number;
}

export class VerticalScrollBar extends Component<Props, SpreadsheetChildEnv> {
  static props = {
    topOffset: { type: Number, optional: true },
  };
  static components = { ScrollBar };
  static template = xml/*xml*/ `
    <ScrollBar
      t-if="isDisplayed"
      height="height"
      position="position"
      offset="offset"
      direction="'vertical'"
      onScroll.bind="onScroll"
    />`;
  static defaultProps = {
    topOffset: 0,
  };

  get offset() {
    return this.env.model.getters.getActiveSheetScrollInfo().scrollY;
  }

  get height() {
    return this.env.model.getters.getScrollbarSize("vertical");
  }

  get isDisplayed() {
    const { yRatio } = this.env.model.getters.getFrozenSheetViewRatio(
      this.env.model.getters.getActiveSheetId()
    );
    return yRatio < 1;
  }

  get position() {
    const { y } = this.env.model.getters.getMainViewportRect();
    const scrollbarWidth = this.env.model.getters.getScrollBarWidth();
    return {
      top: `${this.props.topOffset + y}px`,
      right: "0px",
      width: `${scrollbarWidth}px`,
      bottom: isBrowserFirefox() ? `${scrollbarWidth}px` : "0",
    };
  }

  onScroll(offset) {
    const { scrollX } = this.env.model.getters.getActiveSheetScrollInfo();
    this.env.model.dispatch("SET_VIEWPORT_OFFSET", {
      offsetX: scrollX, // offsetX is the same
      offsetY: offset,
    });
  }
}
