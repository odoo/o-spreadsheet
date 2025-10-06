import { Disposable, Get, StoreConstructor } from "@odoo/o-spreadsheet-engine/types/store_engine";

/**
 * Create a store to expose an external resource (which is not a store itself)
 * to other stores.
 * The external resource needs to be injected in the store provider to provide
 * the store implementation.
 *
 * @example
 * const MyMetaStore = createAbstractStore("MyStore");
 * const stores = useStoreProvider();
 * stores.inject(MyMetaStore, externalResourceInstance);
 */
export function createAbstractStore<T extends unknown>(storeName: string): StoreConstructor<T> {
  class MetaStore {
    constructor(get: Get) {
      throw new Error(`This is a abstract store for ${storeName}, it cannot be instantiated.
Did you forget to inject your store instance?

const stores = useStoreProvider();
stores.inject(MyMetaStore, storeInstance);
`);
    }
  }
  return MetaStore as StoreConstructor<T>;
}

export class DisposableStore implements Disposable {
  private disposeCallbacks: (() => void)[] = [];

  constructor(protected get: Get) {}

  protected onDispose(callback: () => void) {
    this.disposeCallbacks.push(callback);
  }

  dispose() {
    this.disposeCallbacks.forEach((cb) => cb());
  }
}
