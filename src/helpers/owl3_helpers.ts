import {
  effect,
  onMounted,
  onPatched,
  onWillDestroy,
  PluginConstructor,
  providePlugins,
  usePlugin,
} from "@odoo/owl";

/**
 * Comes from https://github.com/odoo/odoo/blob/master/addons/web/static/src/owl2/utils.js
 */
export function render(component: any, deep = false) {
  component.__owl__.render(deep);
}

export function providePluginsIfNotPresent(
  pluginConstructors: PluginConstructor[],
  config: Object = {}
) {
  for (const pluginConstructor of pluginConstructors) {
    try {
      usePlugin(pluginConstructor);
    } catch (e) {
      providePlugins([pluginConstructor], config);
    }
  }
}

/**
 * Similar to useEffect, but runs after the DOM has been patched. A change in the effect dependency will
 * trigger a render(false) in the component, and the callback will be called in onPatched.
 */
export function useEffectAfterPatch(callback: () => void) {
  let node: { render: (deep: boolean) => Promise<void>; isDestroyed: () => boolean } | undefined;
  let needRender = true;
  let cleanupEffect: (() => void) | undefined;

  onMounted((componentNode) => {
    node = componentNode;
    callbackWithEffect();
  });
  onPatched(callbackWithEffect);
  onWillDestroy(() => {
    cleanupEffect?.();
    cleanupEffect = undefined;
  });

  function requestComponentRender() {
    needRender = true;
    void node?.render(false); // the drawing happens in onPatched
  }

  function callbackWithEffect() {
    if (!needRender || node?.isDestroyed()) {
      return;
    }
    needRender = false;
    cleanupEffect?.();
    cleanupEffect = undefined;

    // First call of the effect will run the callback, subscribing the effect to the reactive values of the callback.
    // If a reactive value changes, the effect triggers a new render of the component, which will call the callback in the `onPatched`
    let firstCall = true;
    cleanupEffect = effect(() => {
      if (firstCall) {
        firstCall = false;
        callback();
        return;
      }
      requestComponentRender();
    });
  }
}
