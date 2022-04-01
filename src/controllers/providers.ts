import { reactive, useComponent } from "@odoo/owl";

type Provider<T extends StateNotifier = any> = () => T;

const providers: Map<Provider, StateNotifier> = new Map();

export class StateNotifier<State extends Object = any> {
  readonly state: State;
  private observers = new Set<() => void>();
  constructor(state: State) {
    this.state = reactive(state, () => this.notify());
  }

  watch(callback: () => void) {
    this.observers.add(callback);
  }

  private notify() {
    for (const callback of this.observers) {
      callback();
    }
  }
}

export function useSharedUI<T extends StateNotifier>(provider: Provider<T>): T {
  if (!providers.has(provider)) {
    const controller = provider();
    providers.set(provider, controller);
  }
  const component = useComponent();
  const controller = providers.get(provider)!;
  controller.watch(() => component.render()); // TODO batch
  return controller as T;
}
