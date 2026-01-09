import { _t } from "@odoo/o-spreadsheet-engine";
import { TABLE_STYLE_CATEGORIES } from "@odoo/o-spreadsheet-engine/helpers/table_presets";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { TableConfig, TableStyle } from "@odoo/o-spreadsheet-engine/types/table";
import { Component, useExternalListener, useRef, useState } from "@odoo/owl";
import { isChildEvent } from "../../helpers/dom_helpers";
import { Popover, PopoverProps } from "../../popover/popover";
import { TableStylePreview } from "../table_style_preview/table_style_preview";

export interface TableStylesPopoverProps {
  selectedStyleId?: string;
  tableConfig: Omit<TableConfig, "styleId">;
  closePopover: () => void;
  onStylePicked: (styleId: string) => void;
  popoverProps?: PopoverProps;
  tableStyles: Record<string, TableStyle>;
  type: "table" | "pivot";
}

export type CustomTablePopoverMouseEvent = MouseEvent & { hasClosedTableStylesPopover?: boolean };

export interface State {
  selectedCategory: string;
}

export class TableStylesPopover extends Component<TableStylesPopoverProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TableStylesPopover";
  static components = { Popover, TableStylePreview };
  static props = {
    tableConfig: Object,
    popoverProps: { type: Object, optional: true },
    closePopover: Function,
    onStylePicked: Function,
    selectedStyleId: { type: String, optional: true },
    tableStyles: Object,
    type: String,
  };

  private tableStyleListRef = useRef("tableStyleList");
  state = useState<State>({ selectedCategory: this.initialSelectedCategory });

  setup(): void {
    useExternalListener(window, "click", this.onExternalClick, { capture: true });
  }

  onExternalClick(ev: CustomTablePopoverMouseEvent) {
    if (this.tableStyleListRef.el && !isChildEvent(this.tableStyleListRef.el, ev)) {
      this.props.closePopover();
      ev.hasClosedTableStylesPopover = true;
    }
  }

  get displayedStyles(): string[] {
    const styles = this.props.tableStyles;
    return Object.keys(styles).filter(
      (styleId) => styles[styleId].category === this.state.selectedCategory
    );
  }

  get initialSelectedCategory() {
    return this.props.selectedStyleId
      ? this.props.tableStyles[this.props.selectedStyleId].category
      : "medium";
  }

  get categories() {
    return this.props.type === "table"
      ? { ...TABLE_STYLE_CATEGORIES, custom: _t("Custom") }
      : TABLE_STYLE_CATEGORIES;
  }

  newTableStyle() {
    this.props.closePopover();
    this.env.openSidePanel("TableStyleEditorPanel", {
      onStylePicked: this.props.onStylePicked,
    });
  }
}
