import { Model } from "../../src";
import { DependencyContainer, StoreConstructor, StoreParams } from "../../src/store_engine";
import { ModelStore } from "../../src/stores";
import { NotificationStore, NotificationStoreMethods } from "../../src/stores/notification_store";
import { makeTestNotificationStore } from "./helpers";

interface MakeStoreOptions<T extends StoreConstructor> {
  storeArgs?: StoreParams<T>;
  notificationCallbacks?: Partial<NotificationStoreMethods>;
}

export function makeStore<T extends StoreConstructor>(Store: T, options?: MakeStoreOptions<T>) {
  return makeStoreWithModel(new Model(), Store, options);
}

export function makeStoreWithModel<T extends StoreConstructor>(
  model: Model,
  Store: T,
  options?: MakeStoreOptions<T>
) {
  const container = new DependencyContainer();
  container.inject(ModelStore, model);
  container.inject(NotificationStore, makeTestNotificationStore(options?.notificationCallbacks));
  return {
    store: container.instantiate(Store, ...(options?.storeArgs || [])) as InstanceType<T>,
    container,
    model: container.get(ModelStore),
  };
}
