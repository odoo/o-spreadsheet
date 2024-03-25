import { Component, useRef } from "@odoo/owl";
import { getPivotHighlights } from "../../../helpers/pivot/pivot_highlight";
import { useHighlightsOnHover } from "../../helpers/highlight_hook";

class PivotPreview extends Component {
  static template = "o-spreadsheet-PivotPreview";
  static props = { pivotId: String };
  setup() {
    const previewRef = useRef("pivotPreview");
    useHighlightsOnHover(previewRef, this);
  }

  selectPivot() {
    this.env.openSidePanel("PIVOT_PROPERTIES_PANEL", { pivotId: this.props.pivotId });
  }

  get highlights() {
    return getPivotHighlights(this.env.model.getters, this.props.pivotId);
  }
}

export class AllPivotsSidePanel extends Component {
  static template = "o-spreadsheet-AllPivotsSidePanel";
  static components = { PivotPreview };
  static props = { onCloseSidePanel: Function };
}
