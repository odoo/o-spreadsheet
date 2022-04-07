import {
  HEADER_HEIGHT,
  MENU_ITEM_HEIGHT,
  MENU_SEPARATOR_HEIGHT,
  MENU_WIDTH,
  TOPBAR_HEIGHT,
} from "../constants";
import { FullMenuItem, MenuItem } from "../registries";
import { DOMCoordinates } from "../types";
import { store, Store, StoreConfig } from "./providers";

interface MenuActionHandlers {
  onClose?: () => void;
  onMenuClicked?: (menuActionResult: any) => void;
}

class MenuActions {
  constructor(private state: MenuInternalState) {}

  open(menuItems: FullMenuItem[], position: DOMCoordinates, handlers: MenuActionHandlers = {}) {
    this.state.menuItems = menuItems;
    this.state.position = position;
    // check if menuItems are different?
    this.state.subMenu?.notify.close();
  }

  close() {
    this.state.subMenu?.notify.close();
    this.state.menuItems = [];
    this.state.position = { x: 0, y: 0 };
  }

  openSubMenu(menuItems: FullMenuItem[], position: DOMCoordinates) {
    if (this.state.subMenu === undefined) {
      this.state.subMenu = store(menuProvider(this.state.depth + 1));
    }
    this.state.subMenu.notify.open(menuItems, position);
  }
}

interface OpenedMenu {
  isOpen: true;
  menuItems: FullMenuItem[];
  subMenu: Menu;
  position: DOMCoordinates;
  menuHeight: number;
  popoverProps: {
    marginTop: number;
    flipHorizontalOffset: number;
    flipVerticalOffset: number;
  };
}

interface ClosedMenu {
  isOpen: false;
}

type Menu = OpenedMenu | ClosedMenu;

interface MenuInternalState {
  menuItems: any[];
  depth: number;
  position?: DOMCoordinates;
  subMenu?: Store<Menu, MenuActions>;
}

export type MenuStore = Store<Menu, MenuActions>;
// export class ContextMenu {
//   menuItems: FullMenuItem[] = [];
//   position: DOMCoordinates = { x: 0, y: 0 };
//   subMenu: ContextMenu = new ContextMenu(); // no, it breaks all good design properties => should be intrinsic to the store
//   scrollOffset: number = 0;

//   get isOpen(): boolean {
//     return this.menuItems.length !== 0;
//   }

//   open(menuItems: FullMenuItem[], position: DOMCoordinates, handlers: MenuActionHandlers = {}) {
//     this.menuItems = menuItems;
//     this.position = position;
//   }

//   close() {
//     this.subMenu.close();
//     this.menuItems = [];
//     this.position = { x: 0, y: 0 };
//   }

//   openSubMenu(menuItems: FullMenuItem[], position: DOMCoordinates) {
//     this.subMenu.open(menuItems, position);
//   }
// }

export const menuProvider: (depth?: number) => StoreConfig<MenuInternalState, Menu, MenuActions> = (
  depth: number = 1
) => ({
  actions: MenuActions,
  state: {
    depth,
    menuItems: [],
  },
  computePublicState: (state) => {
    if (state.menuItems.length === 0 || state.position === undefined) {
      return { isOpen: false };
    }
    return {
      isOpen: true,
      menuItems: [],
      position: state.position,
      subMenu: state.subMenu?.state || { isOpen: false },
      menuHeight: menuComponentHeight(state.menuItems),
      popoverProps: computePopoverProps(state.depth),
    };
  },
});

function menuComponentHeight(menuItems: MenuItem[]): number {
  const separators = menuItems.filter((m) => m.separator);
  const others = menuItems;
  return MENU_ITEM_HEIGHT * others.length + separators.length * MENU_SEPARATOR_HEIGHT;
}

function computePopoverProps(depth: number) {
  const isRoot = depth === 1;
  return {
    // some margin between the header and the component
    marginTop: HEADER_HEIGHT + 6 + TOPBAR_HEIGHT,
    flipHorizontalOffset: MENU_WIDTH * (depth - 1),
    flipVerticalOffset: isRoot ? 0 : MENU_ITEM_HEIGHT,
  };
}
