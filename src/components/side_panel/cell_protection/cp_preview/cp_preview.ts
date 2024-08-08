import { Component, useRef } from "@odoo/owl";
import { FIGURE_BORDER_COLOR, HIGHLIGHT_COLOR } from "../../../../constants";
import { CellProtectionRule, Highlight, SpreadsheetChildEnv } from "../../../../types";
import { css } from "../../../helpers";
import { useHighlightsOnHover } from "../../../helpers/highlight_hook";

css/* scss */ `
  .o-sidePanel {
    .o-cp-preview {
      height: 70px;
      box-sizing: border-box;
      cursor: pointer;
      border-bottom: 1px solid ${FIGURE_BORDER_COLOR};

      .o-cp-container {
        min-width: 0; // otherwise flex won't shrink correctly
      }

      .o-cp-preview-description {
        font-size: 13px;
      }

      &:hover {
        background-color: rgba(0, 0, 0, 0.08);
      }

      &:not(:hover) .o-cp-preview-delete {
        display: none !important;
      }
    }
  }
`;
interface Props {
  onClick: () => void;
  rule: CellProtectionRule;
}

export class CellProtectionPreview extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-CellProtectionPreview";
  static props = {
    onClick: Function,
    rule: Object,
  };

  private ref = useRef("cpPreview");

  setup() {
    useHighlightsOnHover(this.ref, this);
  }

  deleteCellProtection() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    this.env.model.dispatch("REMOVE_CELL_PROTECTION_RULE", { sheetId, id: this.props.rule.id });
  }

  get highlights(): Highlight[] {
    return this.props.rule.ranges.map((range) => ({
      sheetId: this.env.model.getters.getActiveSheetId(),
      zone: range.zone,
      color: HIGHLIGHT_COLOR,
      fillAlpha: 0.06,
    }));
  }

  get rangesString(): string {
    const sheetId = this.env.model.getters.getActiveSheetId();
    return this.props.rule.ranges
      .map((range) => this.env.model.getters.getRangeString(range, sheetId))
      .join(", ");
  }
}
