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
  // TODO type param
  watch<State>(provider: Provider<State, any>): Readonly<State>;
  notify<Actions>(provider: Provider<any, Actions>): Readonly<Actions>;
  use<State, Actions>(provider: Provider<State, Actions>): Store<State, Actions>;
  withParam<ExternalParam>(param: ExternalParam): Omit<Providers, "withParam">;
}

export type StoresWatch = {
  watch: Providers["watch"];
  withParam: (param: ExternalParam) => { watch: Providers["watch"] }; // TODO type this
};

// type StateProvider<T = any> = (providers: Providers) => Readonly<T>;
// type StateNotifierProvider<T extends StateNotifier = any> = (providers: Providers) => T;

type Provider<State = any, Actions = any> = (
  stores: StoresWatch,
  param: ExternalParam
) => StoreConfig<any, State, Actions>;

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

type ExternalParam = any;

export class ProviderContainer {
  private stores: Map<Provider, Map<ExternalParam, any>> = new Map();

  get<State, Actions>(
    provider: Provider<State, Actions>,
    param?: ExternalParam
  ): Store<State, Actions> {
    if (!this._get(provider, param)) {
      const store = this.createStore(provider, param);
      this.addStore(provider, param, store);
      return store;
    }
    return this._get(provider, param)!;
  }

  private _get<State, Actions>(
    provider: Provider<State, Actions>,
    param?: ExternalParam
  ): Store<State, Actions> | undefined {
    return this.stores.get(provider)?.get(param);
  }

  private addStore<State, Actions>(
    provider: Provider<State, Actions>,
    param: ExternalParam,
    store: Store<State, Actions>
  ) {
    if (!this.stores.has(provider)) {
      this.stores.set(provider, new Map());
    }
    this.stores.get(provider)?.set(param, store);
  }

  private createStore<T>(provider: Provider<T>, param: ExternalParam): Store<any, any> {
    const coucou = <T>(param: ExternalParam, parentProvider: Provider<T>) => {
      const parentStore = this.get(parentProvider, param);
      // god
      const reactiveStore = reactive(parentStore, () => {
        console.log("invalidate store");
        // if parent state changes, invalidate child which
        // is equivalent to deleting it and rebuild it next time
        // someone needs it.
        this.stores.get(provider)?.delete(param);
      });
      console.log("coucou", parentProvider.name);
      return reactiveStore.state;
    };
    const watch: StoresWatch["watch"] = coucou.bind(null, undefined);
    const withParam = <ExternalParam>(param: ExternalParam) => ({
      watch: coucou.bind(null, param) as StoresWatch["watch"],
    });
    // TODO select
    return store(provider({ watch, withParam }, param));
  }
}

const providerContainer = new ProviderContainer();

// @ts-ignore
window.providerContainer = providerContainer;

export function useProviders(): Providers {
  const component = useComponent();

  // TODO don't call reactive again if already subscribe in the same render
  const watch = (param: ExternalParam, provider: Provider) => {
    const store = providerContainer.get(provider, param);
    return reactive(store, () => component.render()).state;
  };

  const notify = (param: ExternalParam, provider: Provider) => {
    return providerContainer.get(provider, param).notify;
  };

  const use = (param: ExternalParam, provider: Provider) => {
    const store = providerContainer.get(provider, param);
    // state is computed, probably cannot work with reactive
    return reactive(store, () => {
      console.log("render");
      component.render();
    });
  };

  // TODO type this
  return {
    watch: watch.bind(null, undefined),
    notify: notify.bind(null, undefined),
    use: use.bind(null, undefined),
    withParam: (param) => ({
      watch: watch.bind(null, param),
      notify: notify.bind(null, param),
      use: use.bind(null, param),
    }),
  };
}

// use a root scope instead to inject it in the `env`
// otherwise you need to think of super.setup, and I won't
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
    console.log("recompute, state will be assigned", ActionsConstructor);
    store.state = computeView(reactiveState);
  });
  const actions = new ActionsConstructor(reactiveState);
  const store = reactive(
    {
      state: computeView(reactiveState),
      notify: actions,
    },
    () => console.log("ploup")
  );
  return store;
}
