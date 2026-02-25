import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useEffect, useRef } from "@odoo/owl";
import { getBoundingRectAsPOJO } from "../../helpers/dom_helpers";

interface Props {
  icon: "group" | "measure" | "add";
  label: string;
  name?: string;
  class?: string;
  onClickIcon: () => void;
  onClickRemove?: () => void;
  vertical: boolean;
}

export class PivotFacet extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotFacet";
  static props = {
    icon: String,
    label: String,
    name: { type: String, optional: true },
    class: { type: String, optional: true },
    onClickIcon: Function,
    onClickRemove: { type: Function, optional: true },
    vertical: { type: Boolean, optional: true },
  };
  static defaultProps = {
    vertical: false,
  };

  setup() {
    const ref = useRef("facet");
    useEffect(() => {
      if (!this.props.vertical || !ref.el) {
        return;
      }

      // ADRM TODO: I mean this works for rotating the facet, but it's probably better to just use css... the shadow being left for example is kinda ugly
      const element = ref.el;
      const parent = element.parentElement!;
      parent.style.height = "";
      parent.style.width = "";
      element.style.transform = "";
      element.style.position = "absolute";

      const rect = getBoundingRectAsPOJO(element);

      element.style.transform = `rotate(90deg) translate(0px, -${rect.height}px)`;
      element.style.transformOrigin = "top left";

      parent.style.height = rect.width + "px";
      parent.style.width = rect.height + "px";
    });
  }

  get icon() {
    if (this.props.icon === "add") {
      return "o-spreadsheet-Icon.PLUS";
    }
    return "o-spreadsheet-Icon.PIVOT_GROUP";
  }
}
