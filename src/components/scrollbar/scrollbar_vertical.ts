import { Component, xml } from "@odoo/owl";
import { SCROLLBAR_WIDTH } from "../../constants";
import { SpreadsheetChildEnv } from "../../types";
import { ScrollBar } from "./scrollbar";

interface Props {
  position: { top: number };
}

export class VerticalScrollBar extends Component<Props, SpreadsheetChildEnv> {
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
    position: { top: 0 },
  };

  get offset() {
    return this.env.model.getters.getActiveSheetScrollInfo().offsetScrollbarY;
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
    return {
      top: `${this.props.position.top + y}px`,
      right: "0px",
      bottom: `${SCROLLBAR_WIDTH}px`,
    };
  }

  onScroll(offset) {
    const { offsetScrollbarX } = this.env.model.getters.getActiveSheetScrollInfo();
    this.env.model.dispatch("SET_VIEWPORT_OFFSET", {
      offsetX: offsetScrollbarX, // offsetX is the same
      offsetY: offset,
    });
  }
}
