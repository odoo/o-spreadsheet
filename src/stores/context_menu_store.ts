import { reactive } from "@odoo/owl";
import { FullMenuItem, MenuItem } from "../registries";
import { DOMCoordinates } from "../types";

interface MenuActionHandlers {
  onClose?: () => void;
  onMenuClicked?: (menuActionResult: any) => void;
}

class MenuActions {
  constructor(private state: MenuInternalState) {}

  open(menuItems) {
    this.state.menuItems = menuItems;
  }

  openSubMenu(menuItems) {
    if (this.state.subMenu === undefined) {
      this.state.subMenu = MenuStore();
    }
    this.state.subMenu.notify.open(menuItems);
  }
}

interface OpenedMenu {
  isOpen: true;
  menuItems: MenuItem[];
  subMenu: Menu;
}

interface ClosedMenu {
  isOpen: false;
}

type Menu = OpenedMenu | ClosedMenu;

interface MenuInternalState {
  menuItems: any[];
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
