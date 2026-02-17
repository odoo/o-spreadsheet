import { Highlight } from "@odoo/o-spreadsheet-engine";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useRef } from "@odoo/owl";
import { useHighlightsOnHover } from "../../helpers/highlight_hook";

interface Props {
  icon: "group" | "measure" | "add";
  label: string;
  name?: string;
  class?: string;
  onClickIcon: () => void;
  onClickRemove?: () => void;
  disableHover?: boolean;
  getHighlightsOnHover?: () => Highlight[] | undefined;
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
    disableHover: { type: Boolean, optional: true },
    getHighlightsOnHover: { type: Function, optional: true },
  };

  setup(): void {
    const ref = useRef("facet");
    useHighlightsOnHover(ref, this);
  }

  get icon() {
    if (this.props.icon === "add") {
      return "o-spreadsheet-Icon.PLUS";
    }
    return "o-spreadsheet-Icon.PIVOT_GROUP";
  }

  get highlights(): Highlight[] {
    return this.props.getHighlightsOnHover?.() || [];
  }
}
