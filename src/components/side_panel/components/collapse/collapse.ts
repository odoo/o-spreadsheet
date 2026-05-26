import { onMounted, onWillUpdateProps, props, signal } from "@odoo/owl";
import { Component } from "../../../../owl3_compatibility_layer";

import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { types } from "../../../props_validation";

export class Collapse extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Collapse";
  protected props = props({
    isCollapsed: types.boolean(),
  });

  private contentRef = signal<HTMLElement | null>(null);

  setup() {
    onMounted(() => {
      if (this.props.isCollapsed) {
        this.contentRef()?.classList.add("d-none");
      }
    });
    onWillUpdateProps((nextProps) => {
      if (nextProps.isCollapsed !== this.props.isCollapsed) {
        this.startTransition(nextProps.isCollapsed);
      }
    });
  }

  startTransition(isCollapsed: boolean) {
    const el = this.contentRef();
    if (!el) {
      return;
    }
    el.classList.remove("d-none");
    el.classList.add("overflow-hidden");
    const startHeight = isCollapsed ? el.scrollHeight : 0;
    const endHeight = isCollapsed ? 0 : el.scrollHeight;

    const animation = el.animate(
      [{ maxHeight: startHeight + "px" }, { maxHeight: endHeight + "px" }],
      { duration: 350, easing: "ease" }
    );
    animation.onfinish = () => {
      el.classList.remove("overflow-hidden");
      if (this.props.isCollapsed) {
        el.classList.add("d-none");
      }
    };
  }
}
