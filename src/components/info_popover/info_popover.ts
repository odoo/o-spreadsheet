import { MenuMouseEvent, Rect } from "@odoo/o-spreadsheet-engine";
import { withHttps } from "@odoo/o-spreadsheet-engine/helpers/links";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useExternalListener, useRef } from "@odoo/owl";
import { isChildEvent } from "../helpers/dom_helpers";
import { Popover, PopoverProps } from "../popover";

interface Props {
  anchorRect: Rect;
  onClose: () => void;
  annotationText?: string;
  annotationLink?: string;
}

export class InfoPopover extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Info-Popover";
  static props = {
    anchorRect: Object,
    maxHeight: { type: Number, optional: true },
    onClose: Function,
    annotationText: { type: String, optional: true },
    annotationLink: { type: String, optional: true },
  };

  static components = { Popover };

  setup() {
    useExternalListener(window, "click", this.onExternalClick, { capture: true });
  }

  private infoRef = useRef("info");

  get popoverProps(): PopoverProps {
    return {
      anchorRect: this.props.anchorRect,
      maxHeight: 300,
      maxWidth: 350,
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

  getAnnotationLinkWithHttps() {
    if (this.props.annotationLink) {
      return withHttps(this.props.annotationLink);
    }
    return;
  }
}
