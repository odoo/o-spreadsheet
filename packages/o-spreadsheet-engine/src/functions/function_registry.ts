import { Registry } from "../registry";

interface ProcessResult<TStored, TMapped> {
  key: string;
  stored: TStored;
  mapped: TMapped;
}

export abstract class FunctionRegistry<TInput, TStored, TMapped> {
  private registry = new Registry<TStored>();
  mapping: Record<string, TMapped> = {} as Record<string, TMapped>;

  get content(): Record<string, TStored> {
    return this.registry.content;
  }

  add(name: string, descriptor: TInput): this {
    const prepared = this.process(name, descriptor);
    if (this.registry.contains(prepared.key)) {
      throw new Error(`${prepared.key} is already present in this registry!`);
    }
    return this.set(prepared);
  }

  replace(name: string, descriptor: TInput): this {
    const prepared = this.process(name, descriptor);
    return this.set(prepared);
  }

  get(key: string): TStored {
    return this.registry.get(key);
  }

  contains(key: string): boolean {
    return this.registry.contains(key);
  }

  getAll(): TStored[] {
    return this.registry.getAll();
  }

  getKeys(): string[] {
    return this.registry.getKeys();
  }

  remove(key: string): void {
    delete this.mapping[key];
    this.registry.remove(key);
  }

  protected abstract process(name: string, descriptor: TInput): ProcessResult<TStored, TMapped>;

  private set(prepared: ProcessResult<TStored, TMapped>): this {
    this.mapping[prepared.key] = prepared.mapped;
    this.registry.replace(prepared.key, prepared.stored);
    return this;
  }
}
