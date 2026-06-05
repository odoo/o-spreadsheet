import { props, xml } from "@odoo/owl";
import { Component } from "../../owl3_compatibility_layer";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { isBrowserFirefox } from "../helpers/dom_helpers";
import { useModel } from "../owl_plugins/model_plugin";
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

  private model = useModel();

  get offset() {
    return this.model().getters.getActiveSheetScrollInfo().scrollX;
  }

  get width() {
    return this.model().getters.getMainViewportRect().width;
  }

  get isDisplayed() {
    const { xRatio } = this.model().getters.getFrozenSheetViewRatio(
      this.model().getters.getActiveSheetId()
    );
    return xRatio < 1;
  }

  get position() {
    const { x } = this.model().getters.getMainViewportRect();
    const scrollbarWidth = this.model().getters.getScrollBarWidth();
    return {
      left: `${this.props.leftOffset + x}px`,
      bottom: "0px",
      height: `${scrollbarWidth}px`,
      right: isBrowserFirefox() ? `${scrollbarWidth}px` : "0",
    };
  }

  onScroll(offset) {
    const { scrollY } = this.model().getters.getActiveSheetScrollInfo();
    this.model().dispatch("SET_VIEWPORT_OFFSET", {
      offsetX: offset,
      offsetY: scrollY, // offsetY is the same
    });
  }
}
