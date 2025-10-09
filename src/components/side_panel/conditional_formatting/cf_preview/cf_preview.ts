import { Component, useRef } from "@odoo/owl";
import { HIGHLIGHT_COLOR } from "../../../../constants";
import { colorNumberToHex } from "../../../../helpers";
import { criterionEvaluatorRegistry } from "../../../../registries/criterion_registry";
import { ConditionalFormat, Highlight, SpreadsheetChildEnv } from "../../../../types";
import { cellStyleToCss, cssPropertiesToCss } from "../../../helpers";
import { useHighlightsOnHover } from "../../../helpers/highlight_hook";
import { ICONS } from "../../../icons/icons";
import { CfTerms } from "../../../translations_terms";

interface Props {
  conditionalFormat: ConditionalFormat;
  onMouseDown: (ev: MouseEvent) => void;
  class: string;
}

export class ConditionalFormattingPreview extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ConditionalFormattingPreview";
  static props = {
    conditionalFormat: Object,
    onMouseDown: Function,
    class: String,
  };
  icons = ICONS;
  private ref = useRef("cfPreview");

  setup() {
    useHighlightsOnHover(this.ref, this);
  }

  get previewImageStyle(): string {
    const rule = this.props.conditionalFormat.rule;
    if (rule.type === "CellIsRule") {
      return cssPropertiesToCss(cellStyleToCss(rule.style));
    } else if (rule.type === "ColorScaleRule") {
      const minColor = colorNumberToHex(rule.minimum.color);
      const midColor = rule.midpoint ? colorNumberToHex(rule.midpoint.color) : null;
      const maxColor = colorNumberToHex(rule.maximum.color);
      const baseString = "background-image: linear-gradient(to right, ";
      return midColor
        ? baseString + minColor + ", " + midColor + ", " + maxColor + ")"
        : baseString + minColor + ", " + maxColor + ")";
    } else if (rule.type === "DataBarRule") {
      const color = colorNumberToHex(rule.color);
      return `background-image: linear-gradient(to right, ${color} 50%, white 50%)`;
    }
    return "";
  }

  get description(): string {
    const cf = this.props.conditionalFormat;
    switch (cf.rule.type) {
      case "CellIsRule":
        return criterionEvaluatorRegistry
          .get(cf.rule.operator)
          .getPreview({ ...cf.rule, type: cf.rule.operator }, this.env.model.getters);
      case "ColorScaleRule":
        return CfTerms.ColorScale;
      case "IconSetRule":
        return CfTerms.IconSet;
      case "DataBarRule":
        return CfTerms.DataBar;
    }
  }

  get highlights(): Highlight[] {
    const sheetId = this.env.model.getters.getActiveSheetId();
    return this.props.conditionalFormat.ranges.map((range) => ({
      range: this.env.model.getters.getRangeFromSheetXC(sheetId, range),
      color: HIGHLIGHT_COLOR,
      fillAlpha: 0.06,
    }));
  }

  editConditionalFormat() {
    this.env.replaceSidePanel("ConditionalFormattingEditor", "ConditionalFormatting", {
      cf: this.props.conditionalFormat,
      isNewCf: false,
    });
  }

  deleteConditionalFormat() {
    this.env.model.dispatch("REMOVE_CONDITIONAL_FORMAT", {
      id: this.props.conditionalFormat.id,
      sheetId: this.env.model.getters.getActiveSheetId(),
    });
  }
}
