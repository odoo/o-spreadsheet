import { Component, xml } from "@odoo/owl";
import { SCROLLBAR_WIDTH } from "../../constants";
import { SpreadsheetChildEnv } from "../../types";
import { ScrollBar } from "./scrollbar";

interface Props {
  position: { left: number };
}

export class HorizontalScrollBar extends Component<Props, SpreadsheetChildEnv> {
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
    position: { left: 0 },
  };

  get offset() {
    return this.env.model.getters.getActiveSheetScrollInfo().offsetScrollbarX;
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
      left: `${this.props.position.left + x}px`,
      bottom: "0px",
      right: `${SCROLLBAR_WIDTH}px`,
    };
  }

  onScroll(offset) {
    const { offsetScrollbarY } = this.env.model.getters.getActiveSheetScrollInfo();
    this.env.model.dispatch("SET_VIEWPORT_OFFSET", {
      offsetX: offset,
      offsetY: offsetScrollbarY, // offsetY is the same
    });
  }
}
