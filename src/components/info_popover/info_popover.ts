import { props, signal } from "@odoo/owl";
import { withHttps } from "../../helpers/links";
import { Component, useExternalListener } from "../../owl3_compatibility_layer";
import { MenuMouseEvent } from "../../types/misc";
import { PropsOf } from "../../types/props_of";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { isChildEvent } from "../helpers/dom_helpers";
import { Popover } from "../popover/popover";
import { types } from "../props_validation";

export class InfoPopover extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Info-Popover";
  protected props = props({
    anchorRect: types.Rect(),
    onClose: types.function(),
    annotationText: types.string().optional(),
    annotationLink: types.string().optional(),
  });

  static components = { Popover };

  setup() {
    useExternalListener(window, "click", this.onExternalClick, { capture: true });
  }

  private infoRef = signal<HTMLElement | null>(null);

  get popoverProps(): PropsOf<Popover> {
    return {
      anchorRect: this.props.anchorRect,
      maxHeight: 300,
      maxWidth: 350,
      positioning: "bottom-left",
      verticalOffset: 0,
    };
  }

  private onExternalClick(ev: MenuMouseEvent) {
    const el = this.infoRef();
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
