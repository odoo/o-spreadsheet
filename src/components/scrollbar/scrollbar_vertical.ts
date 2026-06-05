import { props, xml } from "@odoo/owl";
import { Component } from "../../owl3_compatibility_layer";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { isBrowserFirefox } from "../helpers/dom_helpers";
import { useModel } from "../owl_plugins/model_plugin";
import { types } from "../props_validation";
import { ScrollBar } from "./scrollbar";

export class VerticalScrollBar extends Component<SpreadsheetChildEnv> {
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

  protected props = props(
    {
      "topOffset?": types.number(),
    },
    {
      topOffset: 0,
    }
  );

  private model = useModel();

  get offset() {
    return this.model().getters.getActiveSheetScrollInfo().scrollY;
  }

  get height() {
    return this.model().getters.getMainViewportRect().height;
  }

  get isDisplayed() {
    const { yRatio } = this.model().getters.getFrozenSheetViewRatio(
      this.model().getters.getActiveSheetId()
    );
    return yRatio < 1;
  }

  get position() {
    const { y } = this.model().getters.getMainViewportRect();
    const scrollbarWidth = this.model().getters.getScrollBarWidth();
    return {
      top: `${this.props.topOffset + y}px`,
      right: "0px",
      width: `${scrollbarWidth}px`,
      bottom: isBrowserFirefox() ? `${scrollbarWidth}px` : "0",
    };
  }

  onScroll(offset) {
    const { scrollX } = this.model().getters.getActiveSheetScrollInfo();
    this.model().dispatch("SET_VIEWPORT_OFFSET", {
      offsetX: scrollX, // offsetX is the same
      offsetY: offset,
    });
  }
}
