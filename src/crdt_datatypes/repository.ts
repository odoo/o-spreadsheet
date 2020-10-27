import * as Y from "yjs";

export interface Repository<State> {
  set<T extends keyof State>(key: T, value: State[T]): void;
  set<T extends keyof State, X extends keyof State[T]>(key: T, key2: X, value: State[T][X]): void;

  get<T extends keyof State>(key: T): State[T];
}

export class CRDTRepository<State> implements Repository<State> {
  constructor(private state: Y.Map<any>) {}

  get<T extends keyof State>(key: T): State[T] {
    return this.state.get(key.toString());
  }

  set(...args: any[]): void {
    const value = args.pop();
    const key = args.pop();
    let node = this.state; // Y.Map || Y.Array
    for (let arg of args) {
      node = node.get(arg);
    }
    node.set(key, value);
  }
}

