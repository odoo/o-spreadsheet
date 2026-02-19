import { Pixel } from "@odoo/o-spreadsheet-engine";
import { ViewportCollection } from "@odoo/o-spreadsheet-engine/helpers/viewport_collection";
import { SelectionState } from "@odoo/o-spreadsheet-engine/plugins/ui_stateful/selection";
import { SpreadsheetRenderingMachinEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, xml } from "@odoo/owl";
import { isBrowserFirefox } from "../helpers/dom_helpers";
import { ScrollBar } from "./scrollbar";

interface Props {
  topOffset: number;
  onScroll: (offsetX: number, offsetY: number) => void;
  viewports: ViewportCollection;
  selectionState: SelectionState;
}

export class VerticalScrollBar extends Component<Props, SpreadsheetRenderingMachinEnv> {
  static props = {
    topOffset: { type: Number, optional: true },
    onScroll: Function,
    viewports: Object,
    selectionState: Object,
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
    return this.props.viewports.getSheetScrollInfo(this.props.selectionState.sheetId).scrollY;
  }

  get height() {
    return this.props.viewports.getMainViewportRect(this.props.selectionState.sheetId).height;
  }

  get isDisplayed() {
    const { yRatio } = this.props.viewports.getFrozenSheetViewRatio(
      this.props.selectionState.sheetId
    );
    return yRatio < 1;
  }

  get position() {
    const { y } = this.props.viewports.getMainViewportRect(this.props.selectionState.sheetId);
    const scrollbarWidth = this.props.viewports.getScrollBarWidth();
    return {
      top: `${this.props.topOffset + y}px`,
      right: "0px",
      width: `${scrollbarWidth}px`,
      bottom: isBrowserFirefox() ? `${scrollbarWidth}px` : "0",
    };
  }

  onScroll(offset: Pixel) {
    const { scrollX } = this.props.viewports.getSheetScrollInfo(this.props.selectionState.sheetId);
    this.props.onScroll(scrollX, offset);
  }
}
