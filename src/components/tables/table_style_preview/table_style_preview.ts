import { onWillUpdateProps, props, proxy, signal, useEffect } from "@odoo/owl";
import { deepEquals } from "../../../helpers/misc";
import { getComputedTableStyle } from "../../../helpers/table_helpers";
import { Component } from "../../../owl3_compatibility_layer";
import { createTableStyleContextMenuActions } from "../../../registries/menus/table_style_menu_registry";
import { PropsOf } from "../../../types/props_of";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { TableMetaData } from "../../../types/table";
import { MenuPopover, MenuState } from "../../menu_popover/menu_popover";
import { types } from "../../props_validation";
import { drawPreviewTable } from "./table_canvas_helpers";

export class TableStylePreview extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TableStylePreview";
  static components = { MenuPopover };

  protected props = props({
    tableConfig: types.TableConfig(),
    tableStyle: types.TableStyle(),
    type: types.or([types.literal("table"), types.literal("pivot")]),
    styleId: types.string().optional(),
    selected: types.boolean().optional(),
    onClick: types.function().optional(),
  });

  private canvasRef = signal<HTMLCanvasElement | null>(null);
  menu: MenuState = proxy({ isOpen: false, anchorRect: null, menuItems: [] });

  setup() {
    onWillUpdateProps((nextProps: PropsOf<TableStylePreview>) => {
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
    useEffect(() => {
      const canvas = this.canvasRef();
      if (!canvas) {
        return;
      }
      resizeObserver.observe(canvas);
      return () => {
        resizeObserver.disconnect();
      };
    });
  }

  private drawTable(props: PropsOf<TableStylePreview>) {
    const canvas = this.canvasRef();
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d")!;
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) {
      return;
    }
    canvas.width = width;
    canvas.height = height;
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
