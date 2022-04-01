import { Component, onWillRender, reactive, useComponent } from "@odoo/owl";
import { EventBus } from "../helpers/event_bus";

export interface Providers {
  watch<T>(provider: Provider<T>): T;
}

type StateProvider<T = any> = (providers: Providers) => T;
type StateNotifierProvider<T extends StateNotifier = any> = (providers: Providers) => T;

type Provider<T = any> = T extends StateNotifier ? StateNotifierProvider<T> : StateProvider<T>;

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

class ProviderContainer {
  private providers: Map<Provider, any> = new Map();
  private providerDependencies: Map<Provider, Set<Provider>> = new Map();

  getOrCreateController<T>(provider: Provider<T>): T {
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
      const watchedStore = this.getOrCreateController(watchedProvider);
      this.addDependency(watchedProvider, provider);
      return watchedStore;
    };
    const store = provider({ watch } as Providers);
    if (store instanceof StateNotifier) {
      store.on("state-updated", this, () => {
        // invalidate dependencies
        this.providerDependencies.get(provider)?.forEach((childProvider) => {
          this.providers.delete(childProvider);
        });
        this.providerDependencies.set(provider, new Set());
      });
    }
    return store;
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

export function useProviders() {
  const component = useComponent();
  const subscriptions = new Set<StateNotifier>();
  onWillRender(() => {
    subscriptions.forEach((controller) => controller.off("state-updated", component));
    subscriptions.clear();
  });
  const watch = (provider: Provider) => {
    const controller = providerContainer.getOrCreateController(provider);
    if (subscriptions.has(controller)) {
      return controller;
    }
    if (controller instanceof StateNotifier) {
      controller.on("state-updated", component, () => component.render());
      subscriptions.add(controller);
    }
    return controller;
  };
  return { watch } as Providers;
}

// use a root scope instead to inject it in the `env`
export class ConsumerComponent<Props, Env> extends Component<Props, Env> {
  protected providers!: Providers;
  setup() {
    super.setup();
    this.providers = useProviders();
  }
}
