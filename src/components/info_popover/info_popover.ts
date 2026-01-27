import { Pixel, Rect } from "@odoo/o-spreadsheet-engine";
import { MENU_WIDTH } from "@odoo/o-spreadsheet-engine/constants";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useExternalListener } from "@odoo/owl";
import { PopoverPropsPosition } from "../../types/cell_popovers";
import { cssPropertiesToCss } from "../helpers";
import { Popover, PopoverProps } from "../popover";

interface Props {
  anchorRect: Rect;
  popoverPositioning: PopoverPropsPosition;
  maxHeight?: Pixel;
  width?: number;
  onClose: () => void;
  infoText?: string;
  infoLink?: string;
}

export interface InfoState {
  isOpen: boolean;
  anchorRect: null | Rect;
}

export class InfoPopover extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Info-Popover";
  static props = {
    anchorRect: Object,
    popoverPositioning: { type: String, optional: true },
    maxHeight: { type: Number, optional: true },
    width: { type: Number, optional: true },
    onClose: Function,
    infoText: { type: String, optional: true },
    infoLink: { type: String, optional: true },
  };

  static components = { Popover };
  static defaultProps = {
    popoverPositioning: "top-right",
    width: MENU_WIDTH,
  };

  setup() {
    useExternalListener(window, "click", this.onExternalClick, { capture: true });
  }

  get popoverProps(): PopoverProps {
    return {
      anchorRect: this.props.anchorRect,
      maxHeight: this.props.maxHeight,
      positioning: "bottom-left",
      verticalOffset: 0,
    };
  }

  private onExternalClick() {
    this.props.onClose();
  }

  get infoStyle() {
    return this.props.width
      ? cssPropertiesToCss({ "max-width": this.props.width + "px", "min-width": MENU_WIDTH + "px" })
      : "";
  }
}
