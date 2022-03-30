import { Registry } from "../registry";
import { SpreadsheetChildEnv } from "../types/env";

//------------------------------------------------------------------------------
// Menu Item Registry
//------------------------------------------------------------------------------

/**
 * An ActionMenuItem represent a menu item for the menus of the topbar.
 * and the context menu in the grid.
 *
 * An ActionMenuItem has:
 * - id, used for example to add child
 * - name, which can be a string or a function to compute it
 * - sequence, which represents its position inside the
 *   menus (the lower sequence it has, the upper it is in the menu)
 * - isVisible, which can be defined to compute the visibility of the item
 * - isReadonlyAllowed: is the action allowed when running spreadsheet in readonly mode
 * - action, the action associated to this item. The action can return a result.
 *   The result will be carried by a `menu-clicked` event to the menu parent component.
 * - children, subitems associated to this item
 *    NB: an item without action or children is not displayed !
 * - separator, whether it should add a separator below the item
 *    NB: a separator defined on the last item is not displayed !
 *
 */
export interface MenuItem {
  name: string | ((env: SpreadsheetChildEnv) => string);
  description?: string;
  sequence: number;
  id?: string;
  isVisible?: (env: SpreadsheetChildEnv) => boolean;
  isEnabled?: (env: SpreadsheetChildEnv) => boolean;
  isReadonlyAllowed?: boolean;
  action?: (env: SpreadsheetChildEnv) => unknown;
  children?: menuChildren;
  separator?: boolean;
  icon?: string;
  textColor?: string;
}

export type FullMenuItem = Required<MenuItem>;

type menuChildren = FullMenuItem[] | ((env: SpreadsheetChildEnv) => FullMenuItem[]);

const DEFAULT_MENU_ITEM = (key: string) => ({
  isVisible: () => true,
  isEnabled: () => true,
  isReadonlyAllowed: false,
  description: "",
  action: false,
  children: [],
  separator: false,
  icon: false,
  id: key,
});

export function createFullMenuItem(key: string, value: MenuItem): FullMenuItem {
  return Object.assign({}, DEFAULT_MENU_ITEM(key), value);
}
/**
 * The class Registry is extended in order to add the function addChild
 *
 */
export class MenuItemRegistry extends Registry<FullMenuItem> {
  /**
   * @override
   */
  add(key: string, value: MenuItem): MenuItemRegistry {
    this.content[key] = createFullMenuItem(key, value);
    return this;
  }
  /**
   * Add a subitem to an existing item
   * @param path Path of items to add this subitem
   * @param value Subitem to add
   */
  addChild(key: string, path: string[], value: MenuItem): MenuItemRegistry {
    const root = path.splice(0, 1)[0];
    let node: FullMenuItem | undefined = this.content[root];
    if (!node) {
      throw new Error(`Path ${root + ":" + path.join(":")} not found`);
    }
    for (let p of path) {
      if (typeof node.children === "function") {
        node = undefined;
      } else {
        node = node.children.find((elt) => elt.id === p);
      }
      if (!node) {
        throw new Error(`Path ${root + ":" + path.join(":")} not found`);
      }
    }
    (node.children as FullMenuItem[]).push(createFullMenuItem(key, value));
    return this;
  }

  /**
   * Get a list of all elements in the registry, ordered by sequence
   * @override
   */
  getAll(): FullMenuItem[] {
    return super.getAll().sort((a, b) => a.sequence - b.sequence);
  }
}
