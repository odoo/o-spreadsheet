import { onMounted, onWillUpdateProps, signal, useProps } from "@odoo/owl";

import { types } from "../../../props_validation";
import { SpreadsheetComponent } from "../../../spreadsheet/spreadsheet_component";

export class Collapse extends SpreadsheetComponent {
  static template = "o-spreadsheet-Collapse";
  protected props = useProps({
    isCollapsed: types.boolean(),
  });

  private contentRef = signal.ref();

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
