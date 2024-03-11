import { Component, useExternalListener, useRef, useState } from "@odoo/owl";
import { TABLE_STYLE_CATEGORIES } from "../../../helpers/table_presets";
import { createTableStyleContextMenuActions } from "../../../registries/menus/table_style_menu_registry";
import { SpreadsheetChildEnv } from "../../../types";
import { TableConfig } from "../../../types/table";
import { css } from "../../helpers";
import { isChildEvent } from "../../helpers/dom_helpers";
import { Menu, MenuState } from "../../menu/menu";
import { Popover, PopoverProps } from "../../popover/popover";
import { TableStylePreview } from "../table_style_preview/table_style_preview";

export interface TableStylesPopoverProps {
  selectedStyleId?: string;
  tableConfig: Omit<TableConfig, "styleId">;
  closePopover: () => void;
  onStylePicked: (styleId: string) => void;
  popoverProps?: PopoverProps;
}

css/* scss */ `
  .o-table-style-popover {
    /** 7 tables preview + padding by line */
    width: calc((66px + 4px * 2) * 7);
    background: #fff;
    font-size: 14px;
    user-select: none;

    .form-check-input {
      font-size: 12px;
    }

    .o-table-style-list-item {
      padding: 3px;
    }

    .o-table-style-popover-preview {
      width: 66px;
      height: 51px;
    }

    .o-new-table-style {
      font-size: 36px;
      color: #666;
      &:hover {
        background: #f5f5f5;
      }
    }
  }

  .o-table-style-list-item {
    border: 1px solid transparent;
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

export interface State {
  selectedCategory: string;
}

export class TableStylesPopover extends Component<TableStylesPopoverProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TableStylesPopover";
  static components = { Popover, TableStylePreview, Menu };
  static props = {
    tableConfig: Object,
    popoverProps: { type: Object, optional: true },
    closePopover: Function,
    onStylePicked: Function,
    selectedStyleId: { type: String, optional: true },
  };

  categories = TABLE_STYLE_CATEGORIES;

  private tableStyleListRef = useRef("tableStyleList");
  state = useState<State>({ selectedCategory: this.initialSelectedCategory });
  menu: MenuState = useState({ isOpen: false, position: null, menuItems: [] });

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
    const styles = this.env.model.getters.getTableStyles();
    return Object.keys(styles).filter(
      (styleId) => styles[styleId].category === this.state.selectedCategory
    );
  }

  get initialSelectedCategory() {
    return this.props.selectedStyleId
      ? this.env.model.getters.getTableStyle(this.props.selectedStyleId).category
      : "medium";
  }

  getStyleName(styleId: string): string {
    return this.env.model.getters.getTableStyle(styleId).displayName;
  }

  newTableStyle() {
    this.props.closePopover();
    this.env.openSidePanel("TableStyleEditorPanel", {
      onStylePicked: this.props.onStylePicked,
    });
  }

  onContextMenu(event: MouseEvent, styleId: string) {
    this.menu.menuItems = createTableStyleContextMenuActions(this.env, styleId);
    this.menu.isOpen = true;
    this.menu.position = { x: event.clientX, y: event.clientY };
  }

  closeMenu() {
    this.menu.isOpen = false;
    this.menu.position = null;
    this.menu.menuItems = [];
  }
}
