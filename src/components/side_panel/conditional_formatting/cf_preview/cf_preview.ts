import { ICONS } from "@odoo/o-spreadsheet-engine/components/icons/icons";
import { CfTerms } from "@odoo/o-spreadsheet-engine/components/translations_terms";
import { HIGHLIGHT_COLOR, TEXT_BODY } from "@odoo/o-spreadsheet-engine/constants";
import { criterionEvaluatorRegistry } from "@odoo/o-spreadsheet-engine/registries/criterion_registry";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useRef } from "@odoo/owl";
import { colorNumberToHex } from "../../../../helpers";
import { ConditionalFormat, Highlight } from "../../../../types";
import { cellStyleToCss, cssPropertiesToCss } from "../../../helpers";
import { useHighlightsOnHover } from "../../../helpers/highlight_hook";

interface Props {
  conditionalFormat: ConditionalFormat;
  onPreviewClick: () => void;
  onMouseDown: (ev: MouseEvent) => void;
  class: string;
}

export class ConditionalFormatPreview extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ConditionalFormatPreview";

  icons = ICONS;

  private ref = useRef("cfPreview");

  setup() {
    useHighlightsOnHover(this.ref, this);
  }

  getPreviewImageStyle(): string {
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
      const barColor = colorNumberToHex(rule.color);
      const gradient = `background-image: linear-gradient(to right, ${barColor} 50%, white 50%)`;
      return `${gradient}; color: ${TEXT_BODY};`;
    }
    return "";
  }

  getDescription(): string {
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

  deleteConditionalFormat() {
    this.env.model.dispatch("REMOVE_CONDITIONAL_FORMAT", {
      id: this.props.conditionalFormat.id,
      sheetId: this.env.model.getters.getActiveSheetId(),
    });
  }

  onMouseDown(event: MouseEvent) {
    this.props.onMouseDown(event);
  }

  get highlights(): Highlight[] {
    const sheetId = this.env.model.getters.getActiveSheetId();
    return this.props.conditionalFormat.ranges.map((range) => ({
      range: this.env.model.getters.getRangeFromSheetXC(sheetId, range),
      color: HIGHLIGHT_COLOR,
      fillAlpha: 0.06,
    }));
  }
}

ConditionalFormatPreview.props = {
  conditionalFormat: Object,
  onPreviewClick: Function,
  onMouseDown: Function,
  class: String,
};
