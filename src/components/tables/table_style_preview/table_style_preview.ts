import { Component, onMounted, onWillUpdateProps, useRef, useState } from "@odoo/owl";
import { deepEquals } from "../../../helpers";
import { getComputedTableStyle } from "../../../helpers/table_helpers";
import { createTableStyleContextMenuActions } from "../../../registries/menus/table_style_menu_registry";
import { SpreadsheetChildEnv } from "../../../types";
import { TableConfig, TableStyle } from "../../../types/table";
import { css } from "../../helpers";
import { Menu, MenuState } from "../../menu/menu";
import { drawPreviewTable } from "./table_canvas_helpers";

interface Props {
  tableConfig: TableConfig;
  tableStyle: TableStyle;
  class: string;
  styleId?: string;
  selected?: boolean;
  onClick?: () => void;
}

css/* scss */ `
  .o-table-style-list-item {
    border: 1px solid transparent;
    &.selected {
      border: 1px solid #007eff;
      background: #f5f5f5;
    }

    &:hover {
      background: #ddd;
      .o-table-style-edit-button {
        display: block !important;
        right: 0;
        top: 0;
        background: #fff;
        cursor: pointer;
        border: 1px solid #ddd;
        padding: 1px 1px 1px 2px;
        .o-icon {
          font-size: 12px;
          width: 12px;
          height: 12px;
        }
      }
    }
  }
`;

export class TableStylePreview extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TableStylePreview";
  static components = { Menu };
  static props = {
    tableConfig: Object,
    tableStyle: Object,
    class: String,
    styleId: { type: String, optional: true },
    selected: { type: Boolean, optional: true },
    onClick: { type: Function, optional: true },
  };

  private canvasRef = useRef<HTMLCanvasElement>("canvas");
  menu: MenuState = useState({ isOpen: false, position: null, menuItems: [] });

  setup() {
    onWillUpdateProps((nextProps) => {
      if (
        !deepEquals(this.props.tableConfig, nextProps.tableConfig) ||
        !deepEquals(this.props.tableStyle, nextProps.tableStyle)
      ) {
        this.drawTable(nextProps);
      }
    });
    onMounted(() => this.drawTable(this.props));
  }

  private drawTable(props: Props) {
    const ctx = this.canvasRef.el!.getContext("2d")!;
    const { width, height } = this.canvasRef.el!.getBoundingClientRect();
    this.canvasRef.el!.width = width;
    this.canvasRef.el!.height = height;
    const computedStyle = getComputedTableStyle(props.tableConfig, props.tableStyle, 5, 5);
    drawPreviewTable(ctx, computedStyle, (width - 1) / 5, (height - 1) / 5);
  }

  onContextMenu(event: MouseEvent) {
    if (!this.props.styleId) {
      return;
    }
    this.menu.menuItems = createTableStyleContextMenuActions(this.env, this.props.styleId);
    this.menu.isOpen = true;
    this.menu.position = { x: event.clientX, y: event.clientY };
  }

  closeMenu() {
    this.menu.isOpen = false;
    this.menu.position = null;
    this.menu.menuItems = [];
  }

  get styleName(): string {
    if (!this.props.styleId) {
      return "";
    }
    return this.env.model.getters.getTableStyle(this.props.styleId).displayName;
  }

  get isStyleEditable(): boolean {
    if (!this.props.styleId) {
      return false;
    }
    return this.env.model.getters.isTableStyleEditable(this.props.styleId);
  }

  editTableStyle() {
    this.env.openSidePanel("TableStyleEditorPanel", { styleId: this.props.styleId });
  }
}
