import { TableConfig, TableStyle } from "@odoo/o-spreadsheet-engine/types/table";
import { Component, onMounted, onWillUpdateProps, useRef, useState } from "@odoo/owl";
import { deepEquals } from "../../../helpers";
import { getComputedTableStyle } from "../../../helpers/table_helpers";
import { createTableStyleContextMenuActions } from "../../../registries/menus/table_style_menu_registry";
import { SpreadsheetChildEnv } from "../../../types";
import { MenuPopover, MenuState } from "../../menu_popover/menu_popover";
import { drawPreviewTable } from "./table_canvas_helpers";

interface Props {
  tableConfig: TableConfig;
  tableStyle: TableStyle;
  class: string;
  styleId?: string;
  selected?: boolean;
  onClick?: () => void;
}

export class TableStylePreview extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TableStylePreview";
  static components = { MenuPopover };
  static props = {
    tableConfig: Object,
    tableStyle: Object,
    class: String,
    styleId: { type: String, optional: true },
    selected: { type: Boolean, optional: true },
    onClick: { type: Function, optional: true },
  };

  private canvasRef = useRef<HTMLCanvasElement>("canvas");
  menu: MenuState = useState({ isOpen: false, anchorRect: null, menuItems: [] });

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
    this.menu.anchorRect = { x: event.clientX, y: event.clientY, width: 0, height: 0 };
  }

  closeMenu() {
    this.menu.isOpen = false;
    this.menu.anchorRect = null;
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
