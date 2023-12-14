import { Model } from "../../src";
import { DependencyContainer, StoreConstructor, StoreParams } from "../../src/store_engine";
import { ModelStore } from "../../src/stores";
import { NotificationStore } from "../../src/stores/notification_store";
import { makeTestNotificationStore } from "./helpers";

export function makeStore<T extends StoreConstructor>(Store: T, ...args: StoreParams<T>) {
  const container = new DependencyContainer();
  container.inject(ModelStore, new Model());
  container.inject(NotificationStore, makeTestNotificationStore());
  return {
    store: container.instantiate(Store, ...args) as InstanceType<T>,
    container,
    model: container.get(ModelStore),
  };
}
