import { MenuMouseEvent, Pixel, Rect } from "@odoo/o-spreadsheet-engine";
import { MENU_WIDTH } from "@odoo/o-spreadsheet-engine/constants";
import { withHttps } from "@odoo/o-spreadsheet-engine/helpers/links";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useExternalListener, useRef } from "@odoo/owl";
import { cssPropertiesToCss } from "../helpers";
import { isChildEvent } from "../helpers/dom_helpers";
import { Popover, PopoverProps } from "../popover";

interface Props {
  anchorRect: Rect;
  maxHeight?: Pixel;
  width: number;
  onClose: () => void;
  annotationText?: string;
  annotationLink?: string;
}

export interface InfoState {
  isOpen: boolean;
  anchorRect: null | Rect;
}

export class InfoPopover extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Info-Popover";
  static props = {
    anchorRect: Object,
    maxHeight: { type: Number, optional: true },
    width: { type: Number, optional: true },
    onClose: Function,
    annotationText: { type: String, optional: true },
    annotationLink: { type: String, optional: true },
  };

  static components = { Popover };
  static defaultProps = {
    width: MENU_WIDTH,
  };

  setup() {
    useExternalListener(window, "click", this.onExternalClick, { capture: true });
  }

  private infoRef = useRef("info");

  get popoverProps(): PopoverProps {
    return {
      anchorRect: this.props.anchorRect,
      maxHeight: this.props.maxHeight,
      positioning: "bottom-left",
      verticalOffset: 0,
    };
  }

  private onExternalClick(ev: MenuMouseEvent) {
    const el = this.infoRef.el;
    if (el && isChildEvent(el, ev)) {
      return;
    }
    ev.closedMenuId = "info-popover";
    this.props.onClose();
  }

  get infoStyle() {
    return this.props.width
      ? cssPropertiesToCss({ "max-width": this.props.width + "px", "min-width": MENU_WIDTH + "px" })
      : "";
  }

  getAnnotationLinkWithHttps() {
    if (this.props.annotationLink) {
      return withHttps(this.props.annotationLink);
    }
    return;
  }
}
