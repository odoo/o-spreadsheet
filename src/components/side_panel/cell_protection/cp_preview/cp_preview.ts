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

      .o-cp-preview-name {
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
    const sheetId =
      this.props.rule.type === "sheet"
        ? this.props.rule.sheetId
        : this.props.rule.ranges[0].sheetId;
    this.env.model.dispatch("REMOVE_CELL_PROTECTION_RULE", { sheetId });
  }

  get highlights(): Highlight[] {
    if (this.props.rule.type === "range") {
      return this.props.rule.ranges.map((range) => ({
        sheetId: range.sheetId,
        zone: range.zone,
        color: HIGHLIGHT_COLOR,
        fillAlpha: 0.06,
      }));
    } else {
      const zonesToHighlight: Highlight[] = [];
      const protectedZones = this.env.model.getters.getSheetRuleProtectedZones(this.props.rule);
      for (const zone of protectedZones) {
        zonesToHighlight.push({
          sheetId: this.props.rule.sheetId,
          zone: zone,
          color: HIGHLIGHT_COLOR,
          fillAlpha: 0.06,
        });
      }
      return zonesToHighlight;
    }
  }

  get rangesString(): string {
    const sheetId = this.env.model.getters.getActiveSheetId();
    if (this.props.rule.type === "range") {
      return this.props.rule.ranges
        .map((range) => this.env.model.getters.getRangeString(range, sheetId))
        .join(", ");
    } else {
      return this.props.rule.excludeRanges
        .map((range) => this.env.model.getters.getRangeString(range, sheetId))
        .join(", ");
    }
  }

  get cellProtectionRuleName(): string {
    return this.env.model.getters.getSheetName(this.props.rule.sheetId);
  }

  get cellProtectionRuleDescription(): string {
    const rule = this.props.rule;
    const ranges = this.rangesString;
    if (rule.type === "range") {
      return ranges;
    } else {
      if (!rule.excludeRanges.length) {
        return "Entire sheet";
      }
      return `Entire sheet except ${ranges}`;
    }
  }
}
