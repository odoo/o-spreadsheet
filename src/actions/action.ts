import { Color, SpreadsheetChildEnv } from "../types";

/*
 * An Action represent a menu item for the menus of the top bar
 * and the context menu in the grid. It can also represent a button
 * used in the toolbar to trigger an action too.
 */
export interface ActionSpec {
  /**
   * String or a function to compute the name
   */
  name: string | ((env: SpreadsheetChildEnv) => string);
  description?: string | ((env: SpreadsheetChildEnv) => string);
  /**
   * which represents its position inside the
   * menus (the lower sequence it has, the upper it is in the menu)
   */
  sequence?: number;
  /**
   * used for example to add child
   */
  id?: string;
  /**
   * Can be defined to compute the visibility of the item
   */
  isVisible?: (env: SpreadsheetChildEnv) => boolean;
  /**
   * Can be defined to compute if the user can click on the action
   */
  isEnabled?: (env: SpreadsheetChildEnv) => boolean;
  /**
   * Can be defined to compute if the action is active
   */
  isActive?: (env: SpreadsheetChildEnv) => boolean;
  /**
   * Can be defined to display an icon
   */
  icon?: string | ((env: SpreadsheetChildEnv) => string);
  /**
   * Can be defined to display another icon on the right of the item.
   */
  secondaryIcon?: string | ((env: SpreadsheetChildEnv) => string);
  /**
   * is the action allowed when running spreadsheet in readonly mode
   */
  isReadonlyAllowed?: boolean;
  /**
   * Execute the action. The action can return a result.
   * The result will be carried by a `menu-clicked` event to the menu parent component.
   */
  execute?: (env: SpreadsheetChildEnv) => unknown;
  /**
   * subitems associated to this item
   * NB: an action without an execute function or children is not displayed !
   */
  children?: ActionChildren;
  /**
   * whether it should add a separator below the item in menus
   * NB: a separator defined on the last item is not displayed !
   */
  separator?: boolean;
  textColor?: Color;
  onStartHover?: (env: SpreadsheetChildEnv) => void;
  onStopHover?: (env: SpreadsheetChildEnv) => void;
}

export interface Action {
  name: (env: SpreadsheetChildEnv) => string;
  description: (env: SpreadsheetChildEnv) => string;
  sequence: number;
  id: string;
  isVisible: (env: SpreadsheetChildEnv) => boolean;
  isEnabled: (env: SpreadsheetChildEnv) => boolean;
  isActive?: (env: SpreadsheetChildEnv) => boolean;
  icon: (env: SpreadsheetChildEnv) => string;
  secondaryIcon: (env: SpreadsheetChildEnv) => string;
  isReadonlyAllowed: boolean;
  execute?: (env: SpreadsheetChildEnv) => unknown;
  children: (env: SpreadsheetChildEnv) => Action[];
  separator: boolean;
  textColor?: Color;
  onStartHover?: (env: SpreadsheetChildEnv) => void;
  onStopHover?: (env: SpreadsheetChildEnv) => void;
}

export type ActionBuilder = (env: SpreadsheetChildEnv) => ActionSpec[];
type ActionChildren = (ActionSpec | ActionBuilder)[];

export function createActions(menuItems: ActionSpec[]): Action[] {
  return menuItems.map(createAction).sort((a, b) => a.sequence - b.sequence);
}

let nextItemId = 1;

export function createAction(item: ActionSpec): Action {
  const name = item.name;
  const children = item.children;
  const description = item.description;
  const icon = item.icon;
  const secondaryIcon = item.secondaryIcon;
  const itemId = item.id || nextItemId++;
  return {
    id: itemId.toString(),
    name: typeof name === "function" ? name : () => name,
    isVisible: item.isVisible ? item.isVisible : () => true,
    isEnabled: item.isEnabled ? item.isEnabled : () => true,
    isActive: item.isActive,
    execute: item.execute,
    children: children
      ? (env) => {
          return children
            .map((child) => (typeof child === "function" ? child(env) : child))
            .flat()
            .map(createAction);
        }
      : () => [],
    isReadonlyAllowed: item.isReadonlyAllowed || false,
    separator: item.separator || false,
    icon: typeof icon === "function" ? icon : () => icon || "",
    secondaryIcon: typeof secondaryIcon === "function" ? secondaryIcon : () => secondaryIcon || "",
    description: typeof description === "function" ? description : () => description || "",
    textColor: item.textColor,
    sequence: item.sequence || 0,
    onStartHover: item.onStartHover,
    onStopHover: item.onStopHover,
  };
}
