import { Registry } from "@odoo/o-spreadsheet-engine/registries/registry";
import { Action, ActionBuilder, ActionSpec, createActions } from "../actions/action";

/**
 * The class Registry is extended in order to add the function addChild
 *
 */
export class MenuItemRegistry extends Registry<ActionSpec> {
  /**
   * @override
   */
  replace(key: string, value: ActionSpec): this {
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
  addChild(key: string, path: string[], value: ActionSpec | ActionBuilder): this {
    return this._replaceChild(key, path, value, { force: false });
  }

  replaceChild(key: string, path: string[], value: ActionSpec | ActionBuilder): this {
    return this._replaceChild(key, path, value, { force: true });
  }

  private _replaceChild(
    key: string,
    path: string[],
    value: ActionSpec | ActionBuilder,
    options: { force: boolean } = { force: true }
  ): this {
    if (typeof value !== "function" && value.id === undefined) {
      value.id = key;
    }
    const root = path.splice(0, 1)[0];
    let node: ActionSpec | undefined = this.content[root];
    if (!node) {
      throw new Error(`Path ${root + ":" + path.join(":")} not found`);
    }
    for (const p of path) {
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
    const children = node.children;
    if (!children || typeof children === "function") {
      throw new Error(`${path} is either not a node or it's dynamically computed`);
    }
    if ("id" in value) {
      const valueIndex = children.findIndex((elt) => "id" in elt && elt.id === value.id);
      if (valueIndex > -1) {
        if (!options.force) {
          throw new Error(`A child with the id "${value.id}" already exists.`);
        }
        node.children.splice(valueIndex, 1, value);
        return this;
      }
    }

    node.children.push(value);
    return this;
  }

  getMenuItems(): Action[] {
    return createActions(this.getAll());
  }
}
