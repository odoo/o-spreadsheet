import { Component, useState } from "@odoo/owl";
import { Action } from "../../../actions/action";
import { SpreadsheetChildEnv, TableConfig, TableStyle } from "../../../types";
import { css } from "../../helpers";
import { Menu, MenuState } from "../../menu/menu";
import { TableStylePreview } from "../table_style_preview/table_style_preview";

css/* scss */ `
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
export interface TableStyleWithId extends TableStyle {
  id: string;
}

interface TablePreviewListProps {
  tableStyles: TableStyleWithId[];
  tableConfig: TableConfig;
  selectedStyleId: string;
  onStylePicked: (styleId: string) => void;
  containerClassName: string;
  previewClassName: string;
  getStyleName?: (styleId: string) => string;
  getContextMenuItems?: (styleId: string) => Action[];
}

export class TablePreviewList extends Component<TablePreviewListProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TablePreviewList";
  static components = { TableStylePreview, Menu };
  //   static props = {
  //   };

  menu: MenuState = useState({ isOpen: false, position: null, menuItems: [] });

  getContainerClass(styleId: string) {
    return (
      this.props.containerClassName + (styleId === this.props.selectedStyleId ? " selected" : "")
    );
  }

  onContextMenu(event: MouseEvent, styleId: string) {
    if (!this.props.getContextMenuItems) return;
    this.menu.menuItems = this.props.getContextMenuItems(styleId);
    this.menu.isOpen = true;
    this.menu.position = { x: event.clientX, y: event.clientY };
  }

  closeMenu() {
    this.menu.isOpen = false;
    this.menu.position = null;
    this.menu.menuItems = [];
  }
}
