/**
 * Registry
 *
 * The Registry class is basically just a mapping from a string key to an object.
 * It is really not much more than an object. It is however useful for the
 * following reasons:
 *
 * 1. it let us react and execute code when someone add something to the registry
 *   (for example, the FunctionRegistry subclass this for this purpose)
 * 2. it throws an error when the get operation fails
 * 3. it provides a chained API to add items to the registry.
 */

export class Registry<T> {
  content: { [key: string]: T } = {};

  /**
   * Add an item to the registry
   *
   * Note that this also returns the registry, so another add method call can
   * be chained
   */
  add(key: string, value: T): Registry<T> {
    this.content[key] = value;
    return this;
  }

  /**
   * Get an item from the registry
   */
  get(key: string): T {
    if (!(key in this.content)) {
      throw new Error(`Cannot find ${key} in this registry!`);
    }
    return this.content[key];
  }

  /**
   * Get a list of all elements in the registry
   */
  getAll(): T[] {
    return Object.values(this.content);
  }
}
