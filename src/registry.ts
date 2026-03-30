export class Registry<T> {
  content: Record<string, T> = {};

  add(key: string, value: T): this {
    if (key in this.content) {
      throw new Error(`${key} is already present in this registry!`);
    }
    return this.replace(key, value);
  }

  replace(key: string, value: T): this {
    this.content[key] = value;
    return this;
  }

  get(key: string): T {
    const content = this.content[key];
    if (!content && !(key in this.content)) {
      throw new Error(`Cannot find ${key} in this registry!`);
    }
    return content;
  }

  contains(key: string): boolean {
    return key in this.content;
  }

  getAll(): T[] {
    return Object.values(this.content);
  }

  getKeys(): string[] {
    return Object.keys(this.content);
  }

  remove(key: string): void {
    delete this.content[key];
  }
}
