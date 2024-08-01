import { Component, onWillUpdateProps, useRef } from "@odoo/owl";
import { colorNumberString, deepEquals } from "../../../../helpers";
import { _t } from "../../../../translation";
import type {
  ColorScaleRule,
  ConditionalFormat,
  SingleColorRules,
  SpreadsheetChildEnv,
  UID,
} from "../../../../types";
import { cellStyleToCss, css, cssPropertiesToCss } from "../../../helpers";
import { getBoundingRectAsPOJO } from "../../../helpers/dom_helpers";
import { useDragAndDropListItems } from "../../../helpers/drag_and_drop_hook";
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
  }
`;
interface Props {
  conditionalFormats: ConditionalFormat[];
  onPreviewClick: (cf: ConditionalFormat) => void;
  onAddConditionalFormat: () => void;
}

export class ConditionalFormatPreviewList extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ConditionalFormatPreviewList";

  icons = ICONS;

  private dragAndDrop = useDragAndDropListItems();
  private cfListRef = useRef("cfList");

  setup() {
    onWillUpdateProps((nextProps: Props) => {
      if (!deepEquals(this.props.conditionalFormats, nextProps.conditionalFormats)) {
        this.dragAndDrop.cancel();
      }
    });
  }

  getPreviewDivStyle(cf: ConditionalFormat): string {
    return this.dragAndDrop.itemsStyle[cf.id] || "";
  }

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

  onMouseDown(cf: ConditionalFormat, event: MouseEvent) {
    if (event.button !== 0) return;

    const previewRects = Array.from(this.cfListRef.el!.children).map((previewEl) =>
      getBoundingRectAsPOJO(previewEl)
    );
    const items = this.props.conditionalFormats.map((cf, index) => ({
      id: cf.id,
      size: previewRects[index].height,
      position: previewRects[index].y,
    }));
    this.dragAndDrop.start("vertical", {
      draggedItemId: cf.id,
      initialMousePosition: event.clientY,
      items: items,
      containerEl: this.cfListRef.el!,
      onDragEnd: (cfId: UID, finalIndex: number) => this.onDragEnd(cfId, finalIndex),
    });
  }

  private onDragEnd(cfId: UID, finalIndex: number) {
    const originalIndex = this.props.conditionalFormats.findIndex((sheet) => sheet.id === cfId);
    const delta = originalIndex - finalIndex;
    if (delta !== 0) {
      this.env.model.dispatch("CHANGE_CONDITIONAL_FORMAT_PRIORITY", {
        cfId,
        delta,
        sheetId: this.env.model.getters.getActiveSheetId(),
      });
    }
  }
}

ConditionalFormatPreviewList.props = {
  conditionalFormats: Array,
  onPreviewClick: Function,
  onAddConditionalFormat: Function,
};
