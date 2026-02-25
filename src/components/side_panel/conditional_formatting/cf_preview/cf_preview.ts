import { ICONS } from "@odoo/o-spreadsheet-engine/components/icons/icons";
import { CfTerms } from "@odoo/o-spreadsheet-engine/components/translations_terms";
import { HIGHLIGHT_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { criterionEvaluatorRegistry } from "@odoo/o-spreadsheet-engine/registries/criterion_registry";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useRef } from "@odoo/owl";
import { colorNumberToHex } from "../../../../helpers";
import { getSpreadsheetTheme } from "../../../../helpers/rendering";
import { ConditionalFormat, Highlight } from "../../../../types";
import { cellStyleToCss, cssPropertiesToCss } from "../../../helpers";
import { useHighlightsOnHover } from "../../../helpers/highlight_hook";

interface Props {
  conditionalFormat: ConditionalFormat;
  onMouseDown: (ev: MouseEvent) => void;
  class: string;
}

export class ConditionalFormatPreview extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ConditionalFormatPreview";
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
    const adaptColor = this.env.model.getters.getAdaptedColor.bind(this.env.model.getters);
    if (rule.type === "CellIsRule") {
      const style = { ...rule.style };
      if (style.fillColor) {
        style.fillColor = adaptColor(style.fillColor);
      }
      if (style.textColor) {
        style.textColor = adaptColor(style.textColor);
      }
      return cssPropertiesToCss(cellStyleToCss(style));
    } else if (rule.type === "ColorScaleRule") {
      const minColor = adaptColor(colorNumberToHex(rule.minimum.color));
      const midColor = rule.midpoint ? adaptColor(colorNumberToHex(rule.midpoint.color)) : null;
      const maxColor = adaptColor(colorNumberToHex(rule.maximum.color));
      const baseString = "background-image: linear-gradient(to right, ";
      return midColor
        ? baseString + minColor + ", " + midColor + ", " + maxColor + ")"
        : baseString + minColor + ", " + maxColor + ")";
    } else if (rule.type === "DataBarRule") {
      const theme = getSpreadsheetTheme(this.env.model.getters.isDarkMode());
      const barColor = adaptColor(colorNumberToHex(rule.color));
      const gradient = `background-image: linear-gradient(to right, ${barColor} 50%, ${theme.backgroundColor} 50%)`;
      return `${gradient}; color: ${theme.textColor};`;
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
