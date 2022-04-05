import { Component, onWillRender, reactive, useComponent } from "@odoo/owl";
import { EventBus } from "../helpers/event_bus";

// https://stackoverflow.com/questions/49397567/how-to-remove-properties-via-mapped-type-in-typescript
// We take the keys of P and if T[P] is a Function we type P as P (the string literal type for the key), otherwise we type it as never.
// Then we index by keyof T, never will be removed from the union of types, leaving just the property keys that were not typed as never
type MethodKeys<T> = { [P in keyof T]: T[P] extends Function ? P : never }[keyof T];
type Methods<T> = Pick<T, MethodKeys<T>>;

type AttributeKeys<T> = { [P in keyof T]: T[P] extends Function ? never : P }[keyof T];
type Attributes<T> = Pick<T, AttributeKeys<T>>;

export interface Providers {
  watch<T>(provider: Provider<T>): Readonly<Attributes<T>>;
  notify<T>(provider: Provider<T>): Readonly<Methods<T>>;
  use<T>(provider: Provider<T>): {
    notify: Readonly<Methods<T>>;
    state: Readonly<Attributes<T>>;
  };
}

type StateProvider<T = any> = (providers: Providers) => Readonly<T>;
// type StateNotifierProvider<T extends StateNotifier = any> = (providers: Providers) => T;

type Provider<T = any> = StateProvider<T>;

// remove those global things with a ProviderContainer
// const providers: Map<Provider, StateNotifier> = new Map();
// const providerDependencies: Map<Provider, Set<Provider>> = new Map();

export class StateNotifier<State extends Object = any> extends EventBus<any> {
  readonly state: State;
  // private observers = new Set<() => void>();
  constructor(state: State) {
    super();
    this.state = reactive(state, () => this.trigger("state-updated"));
  }

  dispose() {
    this.subscriptions = {};
  }

  // watch(callback: () => void) {
  //   this.observers.add(callback);
  // }

  // private notify() {
  //   for (const callback of this.observers) {
  //     callback();
  //   }
  // }
}

// function addDependency(parent: Provider, child: Provider) {
//   const dependencies = providerDependencies.get(parent);
//   if (!dependencies) {
//     providerDependencies.set(parent, new Set());
//   }
//   providerDependencies.get(parent)?.add(child);
// }

// function getOrCreateController<T extends StateNotifier>(provider: Provider<T>): StateNotifier {
//   if (!providers.has(provider)) {
//     const watch = (watchedProvider: Provider) => {
//       const watchedController = getOrCreateController(watchedProvider);
//       addDependency(watchedProvider, provider);
//       watchedController.watch(() => {
//         const dependencies = providerDependencies.get(watchedProvider);
//         if (!dependencies) return;
//         // for (const childProvider of)
//       });
//       return watchedController;
//     };
//     const controller = provider({ watch } as Providers);
//     providers.set(provider, controller);
//     return controller;
//   } else {
//     return providers.get(provider)!;
//   }
// }

// export function useSharedUI<T extends StateNotifier>(provider: Provider<T>): T {
//   const controller = getOrCreateController(provider);
//   const component = useComponent();
//   controller.watch(() => component.render()); // TODO batch
//   return controller as T;
// }

export class ProviderContainer {
  private providers: Map<Provider, any> = new Map();
  private providerDependencies: Map<Provider, Set<Provider>> = new Map();
  // private observers: Map<Provider, Set<() => void>> = new Map();

  get<T>(provider: Provider<T>): T {
    if (!this.providers.has(provider)) {
      const store = this.createStore(provider);
      this.providers.set(provider, store);
      return store;
    } else {
      return this.providers.get(provider)!;
    }
  }

  private createStore<T>(provider: Provider<T>): T {
    const watch = (watchedProvider: Provider) => {
      const watchedStore = this.get(watchedProvider);
      this.addDependency(watchedProvider, provider);
      // return watchedStore;
      // @ts-ignore
      return reactive(watchedStore as T, () => {
        // invalidate dependencies
        // it should not invalidate *all* dependencies
        console.log("invalidate dependencies");
        this.providerDependencies.get(provider)?.forEach((childProvider) => {
          this.providers.delete(childProvider);
        });
        this.providerDependencies.set(provider, new Set());
      });
    };
    // @ts-ignore
    return provider({ watch } as Providers);
    // TODO fix type
    // @ts-ignore
    // return reactive(store as T, () => {
    //   // invalidate dependencies
    //   console.log("invalidate dependencies");
    //   this.providerDependencies.get(provider)?.forEach((childProvider) => {
    //     this.providers.delete(childProvider);
    //   });
    //   this.providerDependencies.set(provider, new Set());
    // });
    // if (store instanceof StateNotifier) {
    //   store.on("state-updated", this, () => {
    //   });
    // }
    // return store;
  }

  private addDependency(parent: Provider, child: Provider) {
    const dependencies = this.providerDependencies.get(parent);
    if (!dependencies) {
      this.providerDependencies.set(parent, new Set());
    }
    this.providerDependencies.get(parent)?.add(child);
  }
}

const providerContainer = new ProviderContainer();

export function useProviders(): Providers {
  const component = useComponent();
  const subscriptions = new Set<StateNotifier>();
  onWillRender(() => {
    // subscriptions.forEach((controller) => controller.off("state-updated", component));
    subscriptions.clear();
  });
  const watch = (provider: Provider) => {
    // lol it's immutable by design
    const store = providerContainer.get(provider);
    if (subscriptions.has(store)) {
      return store;
    }
    // if (controller instanceof StateNotifier) {
    //   controller.on("state-updated", component, () => component.render());
    // }
    // subscriptions.add(store);
    // return reactive(store, () => component.render());
  };
  const notify = (provider: Provider) => {
    return providerContainer.get(provider);
  };
  const use = (provider: Provider) => {
    const store = providerContainer.get(provider);
    return {
      notify: store,
      state: store,
    };
  };
  return { watch, notify, use };
}

// use a root scope instead to inject it in the `env`
export class ConsumerComponent<Props, Env> extends Component<Props, Env> {
  protected providers!: Providers;
  setup() {
    super.setup();
    this.providers = useProviders();
  }
}
