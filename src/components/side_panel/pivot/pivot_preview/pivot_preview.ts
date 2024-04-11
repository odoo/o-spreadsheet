import { Component, useRef } from "@odoo/owl";
import { getPivotHighlights } from "../../../../helpers/pivot/pivot_highlight";
import { css } from "../../../helpers";
import { useHighlightsOnHover } from "../../../helpers/highlight_hook";

css/* scss */ `
  .o_pivot_preview {
    cursor: pointer;
    &:hover {
      background-color: #f1f3f4;
    }
  }
`;

export class PivotPreview extends Component {
  static template = "o-spreadsheet-PivotPreview";
  static props = { pivotId: String };
  setup() {
    const previewRef = useRef("pivotPreview");
    useHighlightsOnHover(previewRef, this);
  }

  selectPivot() {
    this.env.openSidePanel("PivotSidePanel", { pivotId: this.props.pivotId });
  }

  get highlights() {
    return getPivotHighlights(this.env.model.getters, this.props.pivotId);
  }
}
