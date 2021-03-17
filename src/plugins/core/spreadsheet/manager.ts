import { CoreGetters, UID } from "../../../types";

let nextId = 0;
export function getNextId(): UID {
  return (nextId++).toString();
}

export abstract class Manager<T> {
  protected content: Record<UID, T> = {};

  constructor(protected getters: CoreGetters) {}

  register(element: T): UID {
    const id = getNextId();
    this.content[id] = element;
    return id;
  }

  get(id: UID): T {
    if (!(id in this.content)) {
      throw new Error(`Element not found: ${id} on ${this.constructor.name}`);
    }
    return this.content[id];
  }
}
