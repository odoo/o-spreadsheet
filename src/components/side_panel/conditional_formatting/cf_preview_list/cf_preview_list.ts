import { Component, useState } from "@odoo/owl";
import { colorNumberString } from "../../../../helpers";
import { _t } from "../../../../translation";
import {
  ColorScaleRule,
  ConditionalFormat,
  SingleColorRules,
  SpreadsheetChildEnv,
  UpDown,
} from "../../../../types";
import { cellStyleToCss, css, cssPropertiesToCss } from "../../../helpers";
import { ICONS } from "../../../icons/icons";
import { CellIsOperators, CfTerms } from "../../../translations_terms";

css/* scss */ `
  .o-cf-preview-list {
    .o-cf-preview {
      &.o-cf-cursor-ptr {
        cursor: pointer;
      }

      border-bottom: 1px solid #ccc;
      height: 60px;
      padding: 10px;
      position: relative;
      &:hover {
        background-color: rgba(0, 0, 0, 0.08);
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
      .o-cf-reorder {
        color: gray;
        left: 90%;
        position: absolute;
        height: 100%;
        width: 10%;
      }
      .o-cf-reorder-button:hover {
        cursor: pointer;
        background-color: rgba(0, 0, 0, 0.08);
      }
      .o-cf-reorder-button-up {
        width: 15px;
        height: 20px;
        padding: 5px;
        padding-top: 0px;
      }
      .o-cf-reorder-button-down {
        width: 15px;
        height: 20px;
        bottom: 20px;
        padding: 5px;
        padding-top: 0px;
        position: absolute;
      }
    }
  }
`;
interface Props {
  conditionalFormats: ConditionalFormat[];
  onPreviewClick: (cf: ConditionalFormat) => void;
  onAddConditionalFormat: () => void;
}

type Mode = "list" | "reorder";

interface State {
  mode: Mode;
}

export class ConditionalFormatPreviewList extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ConditionalFormatPreviewList";

  icons = ICONS;

  state = useState<State>({
    mode: "list",
  });

  getPreviewImageStyle(rule: SingleColorRules | ColorScaleRule): string {
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

  getDescription(cf: ConditionalFormat): string {
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

  deleteConditionalFormat(cf: ConditionalFormat) {
    this.env.model.dispatch("REMOVE_CONDITIONAL_FORMAT", {
      id: cf.id,
      sheetId: this.env.model.getters.getActiveSheetId(),
    });
  }

  reorderConditionalFormats() {
    this.state.mode = "reorder";
  }

  reorderRule(cf: ConditionalFormat, direction: UpDown) {
    this.env.model.dispatch("MOVE_CONDITIONAL_FORMAT", {
      cfId: cf.id,
      direction: direction,
      sheetId: this.env.model.getters.getActiveSheetId(),
    });
  }

  stopReorder() {
    this.state.mode = "list";
  }
}

ConditionalFormatPreviewList.props = {
  conditionalFormats: Array,
  onPreviewClick: Function,
  onAddConditionalFormat: Function,
};
