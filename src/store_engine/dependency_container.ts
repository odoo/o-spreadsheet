import { EventBus } from "../helpers/event_bus";
import { Get, StoreConstructor, StoreParams } from "../types/store_engine";

interface StoreUpdateEvent {
  type: "store-updated";
}

/**
 * A type-safe dependency container
 */
export class DependencyContainer extends EventBus<StoreUpdateEvent> {
  private dependencies: Map<StoreConstructor, any> = new Map();
  private factory = new StoreFactory(this.get.bind(this));

  private parent?: DependencyContainer;

  /** If the dependency container has a parent, those are the store that will be owned by this container instead of its parent */
  private ownStores: Set<StoreConstructor>;

  constructor(parent?: DependencyContainer, extendedStores: StoreConstructor[] = []) {
    super();
    this.parent = parent;
    this.ownStores = new Set(extendedStores);
  }

  /**
   * Injects a store instance in the dependency container.
   * Useful for injecting an external store that is not created by the container.
   * Also useful for mocking a store.
   */
  inject<T extends StoreConstructor>(Store: T, instance: InstanceType<T>): void {
    if (this.dependencies.has(Store) && this.dependencies.get(Store) !== instance) {
      throw new Error(`Store ${Store.name} already has an instance`);
    }
    this.dependencies.set(Store, instance);
  }

  /**
   * Get an instance of a store.
   */
  get<T>(Store: StoreConstructor<T>): T {
    if (this.parent && !this.ownStores.has(Store)) {
      return this.parent.get(Store);
    }
    if (!this.dependencies.has(Store)) {
      this.dependencies.set(Store, this.instantiate(Store));
    }
    return this.dependencies.get(Store);
  }

  instantiate<T>(Store: StoreConstructor<T>, ...args: StoreParams<StoreConstructor<T>>): T {
    return this.factory.build(Store, ...args);
  }

  resetStores() {
    this.dependencies.clear();
  }

  dispose() {
    for (const instance of this.dependencies.values()) {
      if ("dispose" in instance && typeof instance.dispose === "function") {
        instance.dispose();
      }
    }
  }

  trigger(type: StoreUpdateEvent["type"], payload?: Omit<StoreUpdateEvent, "type">) {
    if (this.parent) {
      this.parent.trigger(type, payload);
    }
    super.trigger(type, payload);
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
