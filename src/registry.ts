export class Registry<T> {
  content: { [key: string]: T } = {};

  add(key: string, value: T): Registry<T> {
    this.content[key] = value;
    return this;
  }

  get(key: string): T {
    if (!(key in this.content)) {
      throw new Error(`Cannot find ${key} in this registry!`);
    }
    return this.content[key];
  }

  getAll(): T[] {
    return Object.values(this.content);
  }
}
