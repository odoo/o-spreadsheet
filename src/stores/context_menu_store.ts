import { reactive } from "@odoo/owl";
import { FullMenuItem } from "../registries";
import { DOMCoordinates } from "../types";

interface MenuActionHandlers {
  onClose?: () => void;
  onMenuClicked?: (menuActionResult: any) => void;
}

class MenuActions {
  constructor(private state: MenuInternalState) {}

  open(menuItems: FullMenuItem[], position: DOMCoordinates, handlers: MenuActionHandlers = {}) {
    this.state.menuItems = menuItems;
    this.state.position = position;
  }

  close() {
    this.state.subMenu?.notify.close();
    this.state.menuItems = [];
    this.state.position = { x: 0, y: 0 };
  }

  openSubMenu(menuItems: FullMenuItem[], position: DOMCoordinates) {
    if (this.state.subMenu === undefined) {
      this.state.subMenu = MenuStore();
    }
    this.state.subMenu.notify.open(menuItems, position);
  }
}

interface OpenedMenu {
  isOpen: true;
  menuItems: FullMenuItem[];
  subMenu: Menu;
}

interface ClosedMenu {
  isOpen: false;
}

type Menu = OpenedMenu | ClosedMenu;

interface MenuInternalState {
  menuItems: any[];
  position?: DOMCoordinates;
  subMenu?: Store<Menu, MenuActions>;
}

type Store<State, Actions> = {
  state: State;
  notify: Actions;
};

const MenuStore: () => Store<Menu, MenuActions> = () =>
  store<MenuInternalState, Menu>(
    {
      menuItems: [],
    },
    MenuActions,
    (state) => {
      if (state.menuItems.length === 0) {
        return { isOpen: false };
      }
      return {
        isOpen: true,
        menuItems: [],
        subMenu: state.subMenu ? state.subMenu.state : { isOpen: false },
      };
    }
  );

function store<S, C>(state: S, actionsConstructor, computePublicState: (state: S) => C) {
  let computedState = computePublicState(state);
  const reactiveState = reactive(state as Object, () => {
    computedState = computePublicState(state);
  });
  const actions = new actionsConstructor(reactiveState);
  return {
    get state() {
      return computedState;
    },
    notify: actions,
  };
}

export class ContextMenu {
  menuItems: FullMenuItem[] = [];
  position: DOMCoordinates = { x: 0, y: 0 };
  subMenu: ContextMenu = new ContextMenu(); // no, it breaks all good design properties => should be intrinsic to the store
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
