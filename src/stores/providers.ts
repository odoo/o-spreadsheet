import { Component, reactive, useComponent } from "@odoo/owl";
// import { EventBus } from "../helpers/event_bus";

// https://stackoverflow.com/questions/49397567/how-to-remove-properties-via-mapped-type-in-typescript
// We take the keys of P and if T[P] is a Function we type P as P (the string literal type for the key), otherwise we type it as never.
// Then we index by keyof T, never will be removed from the union of types, leaving just the property keys that were not typed as never
// type MethodKeys<T> = { [P in keyof T]: T[P] extends Function ? P : never }[keyof T];
// type Methods<T> = Pick<T, MethodKeys<T>>;

// type AttributeKeys<T> = { [P in keyof T]: T[P] extends Function ? never : P }[keyof T];
// type Attributes<T> = Pick<T, AttributeKeys<T>>;

export interface Providers {
  watch<State>(provider: Provider<State, any>): Readonly<State>;
  notify<Actions>(provider: Provider<any, Actions>): Readonly<Actions>;
  use<State, Actions>(provider: Provider<State, Actions>): Store<State, Actions>;
}

// type StateProvider<T = any> = (providers: Providers) => Readonly<T>;
// type StateNotifierProvider<T extends StateNotifier = any> = (providers: Providers) => T;

type Provider<State = any, Actions = any> = () => StoreConfig<any, State, Actions>;

// remove those global things with a ProviderContainer
// const providers: Map<Provider, StateNotifier> = new Map();
// const providerDependencies: Map<Provider, Set<Provider>> = new Map();

// export class StateNotifier<State extends Object = any> extends EventBus<any> {
//   readonly state: State;
//   // private observers = new Set<() => void>();
//   constructor(state: State) {
//     super();
//     this.state = reactive(state, () => this.trigger("state-updated"));
//   }

//   dispose() {
//     this.subscriptions = {};
//   }
// }

export class ProviderContainer {
  private providers: Map<Provider, any> = new Map();

  get<State, Actions>(provider: Provider<State, Actions>): Store<State, Actions> {
    if (!this.providers.has(provider)) {
      const store = this.createStore(provider);
      this.providers.set(provider, store);
      return store;
    } else {
      return this.providers.get(provider)!;
    }
  }

  private createStore<T>(provider: Provider<T>): Store<any, any> {
    return store(provider());
  }
}

const providerContainer = new ProviderContainer();

export function useProviders(): Providers {
  const component = useComponent();

  // TODO don't call reactive again if already subscribe in the same render
  const watch = (provider: Provider) => {
    const store = providerContainer.get(provider);
    return reactive(store, () => component.render()).state;
  };

  const notify = (provider: Provider) => {
    return providerContainer.get(provider).notify;
  };

  const use = (provider: Provider) => {
    const store = providerContainer.get(provider);
    // state is computed, probably cannot work with reactive
    return reactive(store, () => {
      console.log("render");
      component.render();
    });
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

export type Store<State, Actions> = {
  state: Readonly<State>;
  notify: Readonly<Actions>;
};

// const MenuStore: () => Store<Menu, MenuActions> = () => store<MenuInternalState, Menu>();

export interface StoreConfig<State, View, Actions> {
  state: State;
  actions: {
    new (state: State): Actions;
  };
  computeView: (state: State) => View;
}

export function store<State, View, Actions>({
  state,
  actions: ActionsConstructor,
  computeView,
}: StoreConfig<State, View, Actions>): Store<View, Actions> {
  // @ts-ignore
  const reactiveState: State = reactive(state, () => {
    store.state = computeView(reactiveState);
  });
  const actions = new ActionsConstructor(reactiveState);
  const store = reactive({
    state: computeView(reactiveState),
    notify: actions,
  });
  return store;
}
