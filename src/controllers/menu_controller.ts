import { FullMenuItem } from "../registries";
import { DOMCoordinates } from "../types";
import { StateNotifier } from "./providers";

interface MenuActionHandlers {
  onClose?: () => void;
  onMenuClicked?: (menuActionResult: any) => void;
}

class ContextMenuState {
  menuItems: FullMenuItem[] = [];
  position: DOMCoordinates = { x: 0, y: 0 };

  get isOpen(): boolean {
    return this.menuItems.length !== 0;
  }
}

export class ContextMenu extends StateNotifier<ContextMenuState> {
  constructor() {
    super(new ContextMenuState());
  }

  open(menuItems: FullMenuItem[], position: DOMCoordinates, handlers: MenuActionHandlers = {}) {
    this.state.menuItems = menuItems;
    this.state.position = position;
  }

  close() {
    this.state.menuItems = [];
    this.state.position = { x: 0, y: 0 };
  }
}

export const menuProvider = () => new ContextMenu();
