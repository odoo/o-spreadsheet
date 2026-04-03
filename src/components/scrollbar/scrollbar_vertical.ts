import { xml } from "@odoo/owl";
import { Component } from "../../owl3_compatibility_layer";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
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
      t-if="this.isDisplayed"
      height="this.height"
      position="this.position"
      offset="this.offset"
      direction="'vertical'"
      onScroll.bind="(offset) => this.onScroll(offset)"
    />`;
  static defaultProps = {
    topOffset: 0,
  };

  get offset() {
    return this.env.model.getters.getActiveSheetScrollInfo().scrollY;
  }

  get height() {
    return this.env.model.getters.getMainViewportRect().height;
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
