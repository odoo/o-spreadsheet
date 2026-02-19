import { Pixel } from "@odoo/o-spreadsheet-engine";
import { ViewportCollection } from "@odoo/o-spreadsheet-engine/helpers/viewport_collection";
import { SelectionState } from "@odoo/o-spreadsheet-engine/plugins/ui_stateful/selection";
import { SpreadsheetRenderingMachinEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, xml } from "@odoo/owl";
import { isBrowserFirefox } from "../helpers/dom_helpers";
import { ScrollBar } from "./scrollbar";

interface Props {
  leftOffset: number;
  onScroll: (offsetX: number, offsetY: number) => void;
  viewports: ViewportCollection;
  selectionState: SelectionState;
}

export class HorizontalScrollBar extends Component<Props, SpreadsheetRenderingMachinEnv> {
  static props = {
    leftOffset: { type: Number, optional: true },
    onScroll: Function,
    viewports: Object,
    selectionState: Object,
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
    return this.props.viewports.getSheetScrollInfo(this.props.selectionState.sheetId).scrollX;
  }

  get width() {
    return this.props.viewports.getMainViewportRect(this.props.selectionState.sheetId).width;
  }

  get isDisplayed() {
    const { xRatio } = this.props.viewports.getFrozenSheetViewRatio(
      this.props.selectionState.sheetId
    );
    return xRatio < 1;
  }

  get position() {
    const { x } = this.props.viewports.getMainViewportRect(this.props.selectionState.sheetId);
    const scrollbarWidth = this.props.viewports.getScrollBarWidth();
    return {
      left: `${this.props.leftOffset + x}px`,
      bottom: "0px",
      height: `${scrollbarWidth}px`,
      right: isBrowserFirefox() ? `${scrollbarWidth}px` : "0",
    };
  }

  onScroll(offset: Pixel) {
    const { scrollY } = this.props.viewports.getSheetScrollInfo(this.props.selectionState.sheetId);
    this.props.onScroll(offset, scrollY);
  }
}
