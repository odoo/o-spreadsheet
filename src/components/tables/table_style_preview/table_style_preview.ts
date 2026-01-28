import { getComputedTableStyle } from "@odoo/o-spreadsheet-engine/helpers/table_helpers";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { TableConfig, TableMetaData, TableStyle } from "@odoo/o-spreadsheet-engine/types/table";
import { Component, onWillUpdateProps, useEffect, useRef, useState } from "@odoo/owl";
import { deepEquals } from "../../../helpers";
import { createTableStyleContextMenuActions } from "../../../registries/menus/table_style_menu_registry";
import { MenuPopover, MenuState } from "../../menu_popover/menu_popover";
import { drawPreviewTable } from "./table_canvas_helpers";

interface Props {
  tableConfig: TableConfig;
  tableStyle: TableStyle;
  styleId?: string;
  selected?: boolean;
  onClick?: () => void;
  type: "table" | "pivot";
}

export class TableStylePreview extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TableStylePreview";
  static components = { MenuPopover };
  static props = {
    tableConfig: Object,
    tableStyle: Object,
    type: String,
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
    const resizeObserver = new ResizeObserver(() => {
      this.drawTable(this.props);
    });
    useEffect(
      () => {
        resizeObserver.observe(this.canvasRef.el!);
        return () => {
          resizeObserver.disconnect();
        };
      },
      () => [this.canvasRef.el]
    );
  }

  private drawTable(props: Props) {
    const ctx = this.canvasRef.el!.getContext("2d")!;
    const { width, height } = this.canvasRef.el!.getBoundingClientRect();
    if (!width || !height) {
      return;
    }
    this.canvasRef.el!.width = width;
    this.canvasRef.el!.height = height;
    let tableMetaData: TableMetaData;
    if (props.type === "table") {
      tableMetaData = { mode: "table", numberOfCols: 5, numberOfRows: 5 };
    } else {
      tableMetaData = {
        mode: "pivot",
        numberOfCols: 5,
        numberOfRows: 8,
        mainSubHeaderRows: new Set([
          props.tableConfig.numberOfHeaders,
          props.tableConfig.numberOfHeaders + 3,
        ]),
      };
    }
    const computedStyle = getComputedTableStyle(props.tableConfig, props.tableStyle, tableMetaData);
    drawPreviewTable(ctx, computedStyle, {
      ...tableMetaData,
      colWidth: (width - 1) / tableMetaData.numberOfCols,
      rowHeight: (height - 1) / tableMetaData.numberOfRows,
    });
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
    return this.props.tableStyle.displayName;
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
