// @ts-nocheck
/**
 * Owl 2 → Owl 3 compatibility layer.
 *
 * This file patches Owl 3 so that existing Owl 2 code can continue to run
 * with minimal changes. It is intended as a temporary bridge to ease
 * incremental migration from Owl 2 to Owl 3.
 *
 * ---------------------------------------------------------------------------
 * Setup (required to run Owl 2 code on Owl 3)
 * ---------------------------------------------------------------------------
 *
 * 1. Update template directives:
 *    - replace `t-portal` → `t-custom-portal`
 *    - replace `t-model`  → `t-custom-model`
 *
 * 2. Load this file immediately after Owl 3.
 *
 * 3. Update hooks:
 *    - replace all `useEffect` with `useLayoutEffect`
 *      import { useLayoutEffect } from "@odoo/owl";
 *
 * ---------------------------------------------------------------------------
 * Migration (once the app builds successfully)
 * ---------------------------------------------------------------------------
 *
 * Gradually remove the compatibility layer by migrating to native Owl 3:
 *
 * - replace `t-custom-portal` with proper Owl 3 portal usage
 * - replace `t-custom-model` with `t-model` + signals
 * - convert `useLayoutEffect` back to `useEffect` where appropriate
 *
 * The end goal is to eliminate all compatibility shims.
 */

import * as owl from "@odoo/owl";

const {
  __ODOO_COMPATIBILITY_LAYER_ADDED__,
  blockDom,
  config,
  onMounted,
  onPatched, // Exported by Odoo compat layer
  onWillUnmount,
  App: OwlApp,
  Component: OwlComponent, // Exported by Odoo compat layer
  EnvPlugin: OwlEnvPlugin, // Exported by Odoo compat layer
  useChildEnv: OwlUseChildEnv, // Exported by Odoo compat layer
  useChildSubEnv: OwlUseChildSubEnv,
  useComponent: OwlUseComponent, // Exported by Odoo compat layer
  useEnv: OwlUseEnv, // Exported by Odoo compat layer
  useExternalListener: OwlUseExternalListener, // Exported by Odoo compat layer
  useLayoutEffect: OwlUseLayoutEffect, // Exported by Odoo compat layer
  useSubEnv: OwlUseSubEnv, // Exported by Odoo compat layer
  Plugin,
  plugin,
  props,
  providePlugins, // Exported by Odoo compat layer
  useScope,
  xml,
} = owl;

const isOdooCompatLoaded = __ODOO_COMPATIBILITY_LAYER_ADDED__ === true;
export interface ComponentConstructor<Env = any> {
  new (...args: any[]): any;
  template: string;
}

class _Component<Env = any> extends OwlComponent {
  static template = "";
  // @ts-ignore
  public env: Env;

  constructor(node) {
    super(node);
    this.env = useChildEnv();
    this.__owl__ = node;
  }

  setup() {}

  render(deep = false) {
    void this.__owl__.render(deep === true);
  }
}

function _useComponent() {
  return useScope().component;
}

function _useExternalListener(target, eventName, handler, eventParams?) {
  const node = useScope();
  const boundHandler = handler.bind(node.component);
  onMounted(() => target.addEventListener(eventName, boundHandler, eventParams));
  onWillUnmount(() => target.removeEventListener(eventName, boundHandler, eventParams));
}

function onWillRender(cb) {
  const node = useScope();
  const renderFn = node.renderFn;
  node.renderFn = () => {
    cb.call(node.component);
    return renderFn();
  };
}

function _useLayoutEffect(effect, computeDependencies: () => any = () => [NaN]) {
  /** @type {Function} */
  let cleanup;
  /** @type {any[]} */
  let dependencies;
  onMounted(() => {
    dependencies = computeDependencies();
    cleanup = effect(...dependencies);
  });
  onWillRender(() => {
    try {
      computeDependencies();
    } catch {
      // just need to read dependencies to subscribe to signals
    }
  });
  onPatched(() => {
    const newDeps = computeDependencies();
    const shouldReapply = newDeps.some((val, i) => val !== dependencies[i]);
    if (shouldReapply) {
      dependencies = newDeps;
      if (cleanup) {
        cleanup();
      }
      cleanup = effect(...dependencies);
    }
  });
  onWillUnmount(() => cleanup && cleanup());
}

class _EnvPlugin extends Plugin {
  static id = "__ENV__";
  env = config("env") ?? {};
}

function _useEnv() {
  return useScope().component.env;
}

function provideEnv(env) {
  providePlugins([_EnvPlugin], { env });
  return env;
}

function extendEnv(extension) {
  const env = useChildEnv();
  const subEnv = Object.create(env);
  Object.defineProperties(subEnv, Object.getOwnPropertyDescriptors(extension));
  return provideEnv(subEnv);
}

function _useSubEnv(extension) {
  const component = useScope().component;
  component.env = extendEnv(extension);
}

function _useChildSubEnv(extension) {
  extendEnv(extension);
}

function _useChildEnv() {
  return plugin(_EnvPlugin).env;
}

class VPortal extends blockDom.text("").constructor {
  /**
   * @param {any} selector
   * @param {any} content
   */
  constructor(selector, content) {
    super("");
    this.content = content;
    this.selector = selector;
    this.target = null;
  }

  /**
   * @param {any} parent
   * @param {any} anchor
   */
  mount(parent, anchor) {
    super.mount(parent, anchor);
    this.target = document.querySelector(this.selector);
    if (this.target) {
      this.content.mount(this.target, null);
    } else {
      this.content.mount(parent, anchor);
    }
  }

  beforeRemove() {
    this.content.beforeRemove();
  }

  remove() {
    if (this.content) {
      super.remove();
      this.content.remove();
      this.content = null;
    }
  }

  /**
   * @param {any} other
   */
  patch(other) {
    super.patch(other);
    if (this.content) {
      this.content.patch(other.content, true);
    } else {
      this.content = other.content;
      this.content.mount(this.target, null);
    }
  }
}

class Portal extends OwlComponent {
  static template = xml`<t t-call-slot="default"/>`;

  constructor(node) {
    super(node);
    this.props = props();
    this.__owl__ = node;
  }

  setup() {
    const node = this.__owl__;
    const renderContent = node.renderFn;
    node.renderFn = (/** @type {any[]} */ ...args) =>
      new VPortal(node.props.selector, renderContent(...args));

    onMounted(() => {
      const portal = node.bdom;
      if (!portal.target) {
        const target = document.querySelector(node.props.selector);
        if (target) {
          portal.content.moveBeforeDOMNode(target.firstChild, target);
        } else {
          throw new Error("invalid portal target");
        }
      }
    });

    onWillUnmount(() => {
      const portal = node.bdom;
      portal.remove();
    });
  }
}

let refId = 0;
const customDirectives = {
  /**
   * @param {HTMLElement} node
   * @param {string} value
   */
  ref: (node, value) => {
    const refName = `"` + value.replaceAll(/\{\{(.+?)\}\}/g, `" + $1 + "`) + `"`;
    node.setAttribute("t-ref", `__globals__.createRefSignal(this, ${refName}, ${++refId})`);
  },
  /**
   * @param {HTMLElement} node
   * @param {string} value
   * @param {string[]} modifiers
   */
  model: (node, value, modifiers) => {
    let attribute = "t-model";
    for (const modifier of modifiers) {
      attribute += `.${modifier}`;
    }
    const getter = `() => ${value}`;
    const setter = `(nv) => {${value} = nv;}`;
    node.setAttribute(attribute, `__globals__.createModelSignal(${getter}, ${setter})`);
  },
  /**
   * @param {HTMLElement} node
   * @param {string} value
   */
  portal: (node, value) => {
    if (node.nodeName.toLowerCase() !== "t") {
      throw new Error("t-custom-portal should be on a 't' element");
    }
    node.setAttribute("t-component", "__globals__.Portal");
    node.setAttribute("selector", value);
  },
};

const globalValues = {
  /**
   * @param {any} component
   * @param {string} refName
   * @param {number} refId
   */
  createRefSignal: (component, refName, refId) => {
    const node = component.__owl__;
    if (!node.__refs__) {
      node.__refs__ = {};
    }
    if (!node.__refs__[refName]) {
      node.__refs__[refName] = { lastSetId: null, values: {} };
    }
    const refInfo = node.__refs__[refName];

    return {
      /** @param {HTMLElement | null} value */
      set(value) {
        if (value) {
          refInfo.lastSetId = refId;
        }
        refInfo.values[refId] = value;
      },
    };
  },
  /**
   * @param {Function} getter
   * @param {Function} setter
   */
  createModelSignal: (getter, setter) => Object.assign(getter, { set: setter }),
  Portal,
};

class _App extends OwlApp {
  /**
   * @param {any} config
   */
  constructor(config) {
    super({
      ...config,
      customDirectives: {
        ...customDirectives,
        ...config?.customDirectives,
      },
      globalValues: {
        ...globalValues,
        ...config?.globalValues,
      },
      config: config.config
        ? Object.assign(Object.create(config.config), {
            env: config.env,
          })
        : { env: config.env },
    });
    this.pluginManager.startPlugins([_EnvPlugin]);
    this.env = config.env ?? {};
  }

  createRoot(component, config = {}) {
    if (config.env) {
      component = {
        [component.name]: class extends component {
          constructor(node) {
            provideEnv(config.env);
            super(node);
          }
        },
      }[component.name];
    }
    return super.createRoot(component, config);
  }
}

const Component = isOdooCompatLoaded ? (OwlComponent as typeof _Component) : _Component;
const useComponent = isOdooCompatLoaded ? (OwlUseComponent as typeof _useComponent) : _useComponent;
const useExternalListener = isOdooCompatLoaded
  ? (OwlUseExternalListener as typeof _useExternalListener)
  : _useExternalListener;
const useLayoutEffect = isOdooCompatLoaded
  ? (OwlUseLayoutEffect as typeof _useLayoutEffect)
  : _useLayoutEffect;
const EnvPlugin = isOdooCompatLoaded ? (OwlEnvPlugin as typeof _EnvPlugin) : _EnvPlugin;
const useEnv = isOdooCompatLoaded ? (OwlUseEnv as typeof _useEnv) : _useEnv;
const useSubEnv = isOdooCompatLoaded ? (OwlUseSubEnv as typeof _useSubEnv) : _useSubEnv;
const useChildEnv = isOdooCompatLoaded ? (OwlUseChildEnv as typeof _useChildEnv) : _useChildEnv;
const useChildSubEnv = isOdooCompatLoaded
  ? (OwlUseChildSubEnv as typeof _useChildSubEnv)
  : _useChildSubEnv;
const App = isOdooCompatLoaded ? (OwlApp as typeof _App) : _App;

export {
  App,
  Component,
  EnvPlugin,
  useChildEnv,
  useChildSubEnv,
  useComponent,
  useEnv,
  useExternalListener,
  useLayoutEffect,
  useSubEnv,
};
export type Component<Env = any> = _Component<Env>;
export type useComponent = () => any;
export type useExternalListener = (target, eventName, handler, eventParams?) => void;
export type useLayoutEffect = (effect, computeDependencies: () => any) => void;
export type EnvPlugin = _EnvPlugin;
export type useEnv = () => any;
export type useSubEnv = () => any;
export type useChildEnv = () => any;
export type useChildSubEnv = () => any;
export type App = _App;
