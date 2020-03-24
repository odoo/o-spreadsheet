export class Registry<T> {
  private content: { [key: string]: T } = {};

  add(key: string, value: T) {
    this.content[key] = value;
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
