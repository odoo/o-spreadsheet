import { FullMenuItem } from "../registries";
import { DOMCoordinates } from "../types";

interface MenuActionHandlers {
  onClose?: () => void;
  onMenuClicked?: (menuActionResult: any) => void;
}

// class ContextMenuState {
//   menuItems: FullMenuItem[] = [];
//   position: DOMCoordinates = { x: 0, y: 0 };

//   get isOpen(): boolean {
//     return this.menuItems.length !== 0;
//   }
// }

export class ContextMenu {
  menuItems: FullMenuItem[] = [];
  position: DOMCoordinates = { x: 0, y: 0 };
  subMenu: ContextMenu = new ContextMenu(); // no, it breaks all good design properties
  scrollOffset: number = 0;

  get isOpen(): boolean {
    return this.menuItems.length !== 0;
  }

  open(menuItems: FullMenuItem[], position: DOMCoordinates, handlers: MenuActionHandlers = {}) {
    this.menuItems = menuItems;
    this.position = position;
  }

  close() {
    this.subMenu.close();
    this.menuItems = [];
    this.position = { x: 0, y: 0 };
  }

  openSubMenu(menuItems: FullMenuItem[], position: DOMCoordinates) {
    this.subMenu.open(menuItems, position);
  }
}

export const menuProvider = () => new ContextMenu();

class InternalState {
  constructor(state, computePublicState) {
    return state;
  }

  publicState() {
    return 5;
  }
}
function computeState(state, compute) {}
new InternalState(
  {
    menuItems: [],
  },
  (state) => {
    return {
      isOpen: state.menuItems.length === 0,
    };
  }
);
