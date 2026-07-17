import { proxy, useProps } from "@odoo/owl";
import { Action } from "../../actions/action";
import { GROUP_LAYER_WIDTH, HEADER_HEIGHT, HEADER_WIDTH } from "../../constants";
import { Component } from "../../owl3_compatibility_layer";
import { createHeaderGroupContainerContextMenu } from "../../registries/menus/header_group_registry";
import { useStore } from "../../store_engine/store_hooks";
import { ViewportsStore } from "../../stores/viewports_store";
import { CSSProperties, Pixel } from "../../types/misc";
import { DOMCoordinates } from "../../types/rendering";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { Store } from "../../types/store_engine";
import { cssPropertiesToCss } from "../helpers/css";
import { MenuPopover, MenuState } from "../menu_popover/menu_popover";
import { types } from "../props_validation";
import { ColGroup, RowGroup } from "./header_group";

export class HeaderGroupContainer extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-HeaderGroupContainer";
  static components = { RowGroup, ColGroup, MenuPopover };

  protected props = useProps({
    dimension: types.Dimension(),
    layers: types.array(),
  });

  menu: MenuState = proxy({ isOpen: false, anchorRect: null, menuItems: [] });
  private viewStore!: Store<ViewportsStore>;

  setup() {
    this.viewStore = useStore(ViewportsStore);
  }

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
    this.menu.anchorRect = { ...position, width: 0, height: 0 };
    this.menu.menuItems = menuItems;
  }

  closeMenu() {
    this.menu.isOpen = false;
    this.menu.anchorRect = null;
    this.menu.menuItems = [];
  }

  get groupComponent() {
    return this.props.dimension === "ROW" ? RowGroup : ColGroup;
  }

  get hasFrozenPane(): boolean {
    const viewportCoordinates = this.viewStore.mainViewportCoordinates;
    return this.props.dimension === "COL" ? viewportCoordinates.x > 0 : viewportCoordinates.y > 0;
  }

  get scrollContainerStyle(): string {
    const { scrollX, scrollY } = this.viewStore.activeSheetScrollInfo;

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

    const viewportCoordinates = this.viewStore.mainViewportCoordinates;
    if (this.props.dimension === "COL") {
      return HEADER_WIDTH + viewportCoordinates.x;
    } else {
      return HEADER_HEIGHT + viewportCoordinates.y;
    }
  }
}
