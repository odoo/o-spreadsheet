import { Component, useExternalListener, useRef } from "@odoo/owl";
import { BG_HOVER_COLOR } from "../../../constants";
import { getTableStyleName } from "../../../helpers/table_helpers";
import { TABLE_STYLE_CATEGORIES } from "../../../helpers/table_presets";
import { SpreadsheetChildEnv } from "../../../types";
import { TableConfig } from "../../../types/table";
import { css } from "../../helpers";
import { isChildEvent } from "../../helpers/dom_helpers";
import { Popover, PopoverProps } from "../../popover/popover";
import { TableStylePreview } from "../table_style_preview/table_style_preview";

interface TableStylesPopoverProps {
  selectedStyleId?: string;
  tableConfig: Omit<TableConfig, "styleId">;
  closePopover: () => void;
  onStylePicked: (styleId: string) => void;
  popoverProps?: PopoverProps;
}

css/* scss */ `
  .o-table-style-popover {
    /** 7 tables preview + padding by line */
    max-width: calc((66px + 4px * 2) * 7);
    background: #fff;
    font-size: 14px;
    user-select: none;
    .o-table-style-list-item {
      padding: 4px;
      &.selected {
        padding: 3px;
      }

      .o-table-style-popover-preview {
        width: 66px;
        height: 51px;
      }
    }

    .o-new-table-style {
      height: 30px;
      cursor: pointer;

      &:hover {
        background-color: ${BG_HOVER_COLOR};
      }
    }
  }

  .o-table-style-list-item {
    &.selected {
      border: 1px solid #007eff;
      background: #f5f5f5;
    }

    &:hover {
      background: #ddd;
    }
  }
`;

export type CustomTablePopoverMouseEvent = MouseEvent & { hasClosedTableStylesPopover?: boolean };

export class TableStylesPopover extends Component<TableStylesPopoverProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TableStylesPopover";
  static components = { Popover, TableStylePreview };
  static props = {
    tableConfig: Object,
    popoverProps: { type: Object, optional: true },
    closePopover: Function,
    onStylePicked: Function,
    selectedStyleId: { type: String, optional: true },
  };

  stylePresets = this.env.model.getters.getTableStyles();
  categories = TABLE_STYLE_CATEGORIES;

  private tableStyleListRef = useRef("tableStyleList");

  setup(): void {
    useExternalListener(window, "click", this.onExternalClick, { capture: true });
  }

  onExternalClick(ev: CustomTablePopoverMouseEvent) {
    if (this.tableStyleListRef.el && !isChildEvent(this.tableStyleListRef.el, ev)) {
      this.props.closePopover();
      ev.hasClosedTableStylesPopover = true;
    }
  }

  getPresetsByCategory(category: string) {
    return Object.keys(this.stylePresets).filter(
      (key) => this.stylePresets[key].category === category
    );
  }

  getTableConfig(styleId: string): TableConfig {
    // ADMR TODO: change this (same in table panel probably?)
    return { ...this.props.tableConfig, styleId: styleId };
  }

  getStyleName(styleId: string): string {
    return getTableStyleName(styleId, this.stylePresets[styleId]);
  }

  newTableStyle() {
    console.log("newTableStyle");
    this.props.closePopover();
    this.env.openSidePanel("TableStyleEditor", {
      onStylePicked: this.props.onStylePicked,
    });
  }
}
