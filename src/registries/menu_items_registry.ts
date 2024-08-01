import type { Action, ActionBuilder, ActionSpec } from "../actions/action";
import { createActions } from "../actions/action";
import { Registry } from "./registry";

/**
 * The class Registry is extended in order to add the function addChild
 *
 */
export class MenuItemRegistry extends Registry<ActionSpec> {
  /**
   * @override
   */
  add(key: string, value: ActionSpec): MenuItemRegistry {
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
  addChild(key: string, path: string[], value: ActionSpec | ActionBuilder): MenuItemRegistry {
    if (typeof value !== "function" && value.id === undefined) {
      value.id = key;
    }
    const root = path.splice(0, 1)[0];
    let node: ActionSpec | undefined = this.content[root];
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

  getMenuItems(): Action[] {
    return createActions(this.getAll());
  }
}
