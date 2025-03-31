import { Component, onMounted, onWillUpdateProps, useRef } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../types";

interface Props {
  isCollapsed: boolean;
  slots: any;
}

export class Collapse extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Collapse";
  static props = {
    isCollapsed: Boolean,
    slots: Object,
  };

  private contentRef = useRef("content");

  setup() {
    onMounted(() => {
      if (this.props.isCollapsed) {
        this.contentRef.el?.classList.add("d-none");
      }
    });
    onWillUpdateProps((nextProps) => {
      if (nextProps.isCollapsed !== this.props.isCollapsed) {
        this.startTransition(nextProps.isCollapsed);
      }
    });
  }

  startTransition(isCollapsed: boolean) {
    const el = this.contentRef.el;
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
