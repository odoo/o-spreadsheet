import * as Y from "yjs";
import { GlobalCRDT } from "./global";

export interface Repository<State> {
  set<T extends keyof State>(key: T, value: State[T]): void;
  set<T extends keyof State, X extends keyof State[T]>(key: T, key2: X, value: State[T][X]): void;

  get<T extends keyof State>(key: T): State[T];
  get<T extends keyof State, X extends keyof State[T]>(key1: T, key2: X): State[T];
}

export class CRDTRepository<State> implements Repository<State> {
  get state(): Y.Map<any> {
    return this.crdt.get(this.name);
  }

  constructor(protected crdt: GlobalCRDT, protected name: string) {}

  get<T extends keyof State>(...keys: any[]): State[T] {
    let value;
    let node = this.state; // Y.Map || Y.Array
    for (let key of keys) {
      value = node.get(key.toString());
    }
    return value;
  }

  set(...args: any[]): void {
    const value = args.pop();
    const key = args.pop();
    let node = this.state; // Y.Map || Y.Array TODO support Y.Array
    for (let arg of args) {
      node = node.get(arg);
    }
    node.set(key, value);
  }
}
