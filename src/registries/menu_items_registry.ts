import { UuidGenerator } from "../helpers";
import { Color } from "../types";
import { SpreadsheetChildEnv } from "../types/env";
import { Registry } from "./registry";

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
export interface MenuItemSpec {
  name: string | ((env: SpreadsheetChildEnv) => string);
  description?: string;
  sequence?: number;
  id?: string;
  isVisible?: (env: SpreadsheetChildEnv) => boolean;
  isEnabled?: (env: SpreadsheetChildEnv) => boolean;
  isActive?: (env: SpreadsheetChildEnv) => boolean;
  icon?: string;
  isReadonlyAllowed?: boolean;
  action?: (env: SpreadsheetChildEnv) => unknown;
  children?: MenuChildren;
  separator?: boolean;
  textColor?: Color;
}

export interface MenuItem {
  name: (env: SpreadsheetChildEnv) => string;
  description: string;
  sequence: number;
  id: string;
  isVisible: (env: SpreadsheetChildEnv) => boolean;
  isEnabled: (env: SpreadsheetChildEnv) => boolean;
  isActive?: (env: SpreadsheetChildEnv) => boolean;
  icon: string;
  isReadonlyAllowed: boolean;
  action?: (env: SpreadsheetChildEnv) => unknown;
  children: (env: SpreadsheetChildEnv) => MenuItem[];
  separator: boolean;
  textColor?: Color;
}

type MenuItemsBuilder = (env: SpreadsheetChildEnv) => MenuItemSpec[];
type MenuChildren = (MenuItemSpec | MenuItemsBuilder)[];

export function createMenu(menuItems: MenuItemSpec[]): MenuItem[] {
  return menuItems.map(createMenuItem).sort((a, b) => a.sequence - b.sequence);
}

const uuidGenerator = new UuidGenerator();

function createMenuItem(item: MenuItemSpec): MenuItem {
  const name = item.name;
  const children = item.children;
  return {
    id: item.id || uuidGenerator.uuidv4(),
    name: typeof name === "function" ? name : () => name,
    isVisible: item.isVisible ? item.isVisible : () => true,
    isEnabled: item.isEnabled ? item.isEnabled : () => true,
    isActive: item.isActive,
    action: item.action,
    children: children
      ? (env) => {
          return children
            .map((child) => (typeof child === "function" ? child(env) : child))
            .flat()
            .map(createMenuItem);
        }
      : () => [],
    isReadonlyAllowed: item.isReadonlyAllowed || false,
    separator: item.separator || false,
    icon: item.icon || "",
    description: item.description || "",
    textColor: item.textColor,
    sequence: item.sequence || 0,
  };
}

/**
 * The class Registry is extended in order to add the function addChild
 *
 */
export class MenuItemRegistry extends Registry<MenuItemSpec> {
  /**
   * @override
   */
  add(key: string, value: MenuItemSpec): MenuItemRegistry {
    if (value.id === undefined) {
      value.id = key;
    }
    this.content[key] = value;
    return this;
  }
  /**
   * Add a subitem to an existing item
   * @param path Path of items to add this subitem
   * @param value Subitem to add
   */
  addChild(key: string, path: string[], value: MenuItemSpec | MenuItemsBuilder): MenuItemRegistry {
    if (typeof value !== "function" && value.id === undefined) {
      value.id = key;
    }
    const root = path.splice(0, 1)[0];
    let node: MenuItemSpec | undefined = this.content[root];
    if (!node) {
      throw new Error(`Path ${root + ":" + path.join(":")} not found`);
    }
    for (let p of path) {
      const children = node.children;
      if (!children || typeof children === "function") {
        throw new Error(`${p} is either not a node or it's dynamically computed`);
      }
      node = children.find((elt) => elt.id === p);

      if (!node) {
        throw new Error(`Path ${root + ":" + path.join(":")} not found`);
      }
    }
    if (!node.children) {
      node.children = [];
    }
    node.children.push(value);
    return this;
  }

  getMenuItems(): MenuItem[] {
    return createMenu(this.getAll());
  }
}
