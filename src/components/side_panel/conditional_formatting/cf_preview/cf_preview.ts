import { Component, useRef } from "@odoo/owl";
import { colorNumberString } from "../../../../helpers";
import { _t } from "../../../../translation";
import { ConditionalFormat, Highlight, SpreadsheetChildEnv } from "../../../../types";
import { cellStyleToCss, css, cssPropertiesToCss } from "../../../helpers";
import { useHighlightsOnHover } from "../../../helpers/highlight_hook";
import { ICONS } from "../../../icons/icons";
import { CellIsOperators, CfTerms } from "../../../translations_terms";

css/* scss */ `
  .o-cf-preview {
    &.o-cf-cursor-ptr {
      cursor: pointer;
    }

    border-bottom: 1px solid #ccc;
    height: 60px;
    padding: 10px;
    position: relative;
    cursor: pointer;
    &:hover,
    &.o-cf-dragging {
      background-color: #ebebeb;
    }

    &:not(:hover) .o-cf-delete-button {
      display: none;
    }
    .o-cf-preview-icon {
      border: 1px solid lightgrey;
      position: absolute;
      height: 50px;
      width: 50px;
    }
    .o-cf-preview-description {
      left: 65px;
      margin-bottom: auto;
      margin-right: 8px;
      margin-top: auto;
      position: relative;
      width: 142px;
      .o-cf-preview-description-rule {
        margin-bottom: 4px;
        font-weight: 600;
        color: #303030;
        max-height: 2.8em;
        line-height: 1.4em;
      }
      .o-cf-preview-range {
        font-size: 12px;
      }
    }
    .o-cf-delete {
      left: 90%;
      top: 39%;
      position: absolute;
    }
    &:not(:hover):not(.o-cf-dragging) .o-cf-drag-handle {
      display: none !important;
    }
    .o-cf-drag-handle {
      left: -8px;
      cursor: move;
      .o-icon {
        width: 6px;
        height: 30px;
      }
    }
  }
`;
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
      const minColor = colorNumberString(rule.minimum.color);
      const midColor = rule.midpoint ? colorNumberString(rule.midpoint.color) : null;
      const maxColor = colorNumberString(rule.maximum.color);
      const baseString = "background-image: linear-gradient(to right, ";
      return midColor
        ? baseString + minColor + ", " + midColor + ", " + maxColor + ")"
        : baseString + minColor + ", " + maxColor + ")";
    }
    return "";
  }

  getDescription(): string {
    const cf = this.props.conditionalFormat;
    switch (cf.rule.type) {
      case "CellIsRule":
        const description = CellIsOperators[cf.rule.operator];
        if (cf.rule.values.length === 1) {
          return `${description} ${cf.rule.values[0]}`;
        }
        if (cf.rule.values.length === 2) {
          return _t("%s %s and %s", description, cf.rule.values[0], cf.rule.values[1]);
        }
        return description;
      case "ColorScaleRule":
        return CfTerms.ColorScale;
      case "IconSetRule":
        return CfTerms.IconSet;
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
      sheetId,
      zone: this.env.model.getters.getRangeFromSheetXC(sheetId, range).zone,
      fillAlpha: 0.025,
    }));
  }
}

ConditionalFormatPreview.props = {
  conditionalFormat: Object,
  onPreviewClick: Function,
  onMouseDown: Function,
  class: String,
};
