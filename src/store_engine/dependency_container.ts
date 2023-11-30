import { Get, StoreConstructor, StoreParams } from "./store";

/**
 * A type-safe dependency container
 */
export class DependencyContainer {
  private dependencies: Map<StoreConstructor, any> = new Map();
  private factory = new StoreFactory(this.get.bind(this));

  /**
   * Injects a store instance in the dependency container.
   * Useful for injecting an external store that is not created by the container.
   * Also useful for mocking a store.
   */
  inject<T extends StoreConstructor>(Store: T, instance: InstanceType<T>): void {
    this.dependencies.set(Store, instance);
  }

  /**
   * Get an instance of a store.
   */
  get<T>(Store: StoreConstructor<T>): T {
    if (!this.dependencies.has(Store)) {
      this.dependencies.set(Store, this.instantiate(Store));
    }
    return this.dependencies.get(Store);
  }

  instantiate<T>(Store: StoreConstructor<T>, ...args: StoreParams<StoreConstructor<T>>): T {
    return this.factory.build(Store, ...args);
  }
}

class StoreFactory {
  private pendingBuilds: Set<StoreConstructor<any>> = new Set();

  constructor(private get: Get) {}
  /**
   * Build a store instance and get all its dependencies
   * while detecting and preventing circular dependencies
   */
  build<T>(Store: StoreConstructor<T>, ...args: StoreParams<StoreConstructor<T>>): T {
    if (this.pendingBuilds.has(Store)) {
      throw new Error(
        `Circular dependency detected: ${[...this.pendingBuilds, Store]
          .map((s) => s.name)
          .join(" -> ")}`
      );
    }
    this.pendingBuilds.add(Store);
    const instance = new Store(this.get, ...args);
    this.pendingBuilds.delete(Store);
    return instance;
  }
}
