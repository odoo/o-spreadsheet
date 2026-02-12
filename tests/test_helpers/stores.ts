import { Model } from "../../src";
import { DependencyContainer, StoreConstructor, StoreParams } from "../../src/store_engine";
import { ModelStore } from "../../src/stores";
import { NotificationStore } from "../../src/stores/notification_store";
import { registerCleanup } from "../setup/jest.setup";
import { makeTestNotificationStore } from "./helpers";

export function makeStore<T extends StoreConstructor>(Store: T, ...args: StoreParams<T>) {
  return makeStoreWithModel(new Model(), Store, ...args);
}

export function makeStoreWithModel<T extends StoreConstructor>(
  model: Model,
  Store: T,
  ...args: StoreParams<T>
) {
  const container = new DependencyContainer();
  registerCleanup(() => {
    container.dispose();
  });

  container.inject(ModelStore, model);
  container.inject(NotificationStore, makeTestNotificationStore());
  return {
    store: container.instantiate(Store, ...args) as InstanceType<T>,
    container,
    model: container.get(ModelStore),
  };
}

/**
 * Spy the method `DependencyContainer.instantiate` to keep track of all created store instances. Useful to get a local
 * store in a test, those are not directly accessible through the dependency container.
 *
 */
export function spyStoreCreation() {
  const storeInstances = new Map<StoreConstructor, any[]>();
  jest
    .spyOn(DependencyContainer.prototype, "instantiate")
    .mockImplementation(function (
      this: DependencyContainer,
      Store: StoreConstructor,
      ...args: StoreParams<StoreConstructor>
    ) {
      const newStoreInstance = this["factory"].build(Store, ...args);
      if (!storeInstances.has(Store)) {
        storeInstances.set(Store, []);
      }
      storeInstances.get(Store)!.push(newStoreInstance);
      newStoreInstance.onDispose?.(() => {
        const instances = storeInstances.get(Store);
        if (instances) {
          const index = instances.indexOf(newStoreInstance);
          if (index !== -1) {
            instances.splice(index, 1);
          }
        }
      });
      return newStoreInstance;
    });

  return { getStores: (Store: StoreConstructor) => storeInstances.get(Store) || [] };
}
