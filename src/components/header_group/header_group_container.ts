import { Component, useState } from "@odoo/owl";
import type { Action } from "../../actions/action";
import { FROZEN_PANE_HEADER_BORDER_COLOR, GROUP_LAYER_WIDTH } from "../../constants";
import { createHeaderGroupContainerContextMenu } from "../../registries/menus/header_group_registry";
import type { DOMCoordinates, SpreadsheetChildEnv } from "../../types";
import type { CSSProperties, Dimension, HeaderGroup, Pixel } from "../../types/misc";
import { css, cssPropertiesToCss } from "../helpers";
import { HEADER_HEIGHT, HEADER_WIDTH } from "./../../constants";
import type { MenuState } from "./../menu/menu";
import { Menu } from "./../menu/menu";
import { ColGroup, RowGroup } from "./header_group";

interface Props {
  dimension: Dimension;
  layers: HeaderGroup[][];
}

css/* scss */ `
  .o-header-group-frozen-pane-border {
    &.o-group-rows {
      margin-top: -1px;
      border-bottom: 3px solid ${FROZEN_PANE_HEADER_BORDER_COLOR};
    }
    &.o-group-columns {
      margin-left: -1px;
      border-right: 3px solid ${FROZEN_PANE_HEADER_BORDER_COLOR};
    }
  }

  .o-header-group-main-pane {
    &.o-group-rows {
      margin-top: -2px; // Counteract o-header-group-frozen-pane-border offset
    }
    &.o-group-columns {
      margin-left: -2px;
    }
  }
`;

export class HeaderGroupContainer extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-HeaderGroupContainer";
  static components = { RowGroup, ColGroup, Menu };

  menu: MenuState = useState({ isOpen: false, position: null, menuItems: [] });

  getLayerOffset(layerIndex: number): number {
    return layerIndex * GROUP_LAYER_WIDTH;
  }

  onContextMenu(event: MouseEvent) {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const position = { x: event.clientX, y: event.clientY };
    const menuItems = createHeaderGroupContainerContextMenu(sheetId, this.props.dimension);
    this.openContextMenu(position, menuItems);
  }

  openContextMenu(position: DOMCoordinates, menuItems: Action[]) {
    this.menu.isOpen = true;
    this.menu.position = position;
    this.menu.menuItems = menuItems;
  }

  closeMenu() {
    this.menu.isOpen = false;
    this.menu.position = null;
    this.menu.menuItems = [];
  }

  get groupComponent() {
    return this.props.dimension === "ROW" ? RowGroup : ColGroup;
  }

  get hasFrozenPane(): boolean {
    const viewportCoordinates = this.env.model.getters.getMainViewportCoordinates();
    return this.props.dimension === "COL" ? viewportCoordinates.x > 0 : viewportCoordinates.y > 0;
  }

  get scrollContainerStyle(): string {
    const { scrollX, scrollY } = this.env.model.getters.getActiveSheetScrollInfo();

    const cssProperties: CSSProperties = {};
    if (this.props.dimension === "COL") {
      cssProperties.left = `${-scrollX - this.frozenPaneContainerSize}px`;
    } else {
      cssProperties.top = `${-scrollY - this.frozenPaneContainerSize}px`;
    }
    return cssPropertiesToCss(cssProperties);
  }

  get frozenPaneContainerStyle(): string {
    const cssProperties: CSSProperties = {};
    if (this.props.dimension === "COL") {
      cssProperties.width = `${this.frozenPaneContainerSize}px`;
    } else {
      cssProperties.height = `${this.frozenPaneContainerSize}px`;
    }
    return cssPropertiesToCss(cssProperties);
  }

  get frozenPaneContainerSize(): Pixel {
    if (!this.hasFrozenPane) {
      return 0;
    }

    const viewportCoordinates = this.env.model.getters.getMainViewportCoordinates();
    if (this.props.dimension === "COL") {
      return HEADER_WIDTH + viewportCoordinates.x;
    } else {
      return HEADER_HEIGHT + viewportCoordinates.y;
    }
  }
}

HeaderGroupContainer.props = {
  dimension: String,
  layers: Array,
};
