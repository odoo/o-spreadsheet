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
 *    - replace `t-ref`    → `t-custom-ref`
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
 * - replace `t-custom-ref` with `t-ref` + signals
 * - replace `t-custom-model` with `t-model` + signals
 * - convert `useLayoutEffect` back to `useEffect` where appropriate
 *
 * The end goal is to eliminate all compatibility shims.
 */

import * as owl from "@odoo/owl";

export interface ComponentConstructor<Props = any, Env = any> {
  new (...args: any[]): Component<Props, Env>;
  template: string;
}

/**
 * @type {any}
 */
let currentNode = null;

export class Component<Props = any, Env = any> extends owl.Component {
  static template = "";
  static props = {};
  static defaultProps = {};
  // @ts-ignore
  public props: Props;
  // @ts-ignore
  public env: Env;

  constructor(node) {
    super(node);
    this.props = owl.props(null, this.constructor.defaultProps);
    this.env = useChildEnv();
    this.__owl__ = node;
    currentNode = node;
  }

  setup() {}

  render(deep = false) {
    void this.__owl__.render(deep === true);
  }
}

function getCurrentNode() {
  if (!currentNode) {
    throw new Error("No current node");
  }
  return currentNode;
}

export function useRef<T extends HTMLElement = HTMLElement>(name: string): { el: T | null } {
  const node = getCurrentNode();
  if (!node.__refs__) {
    node.__refs__ = {};
  }
  return {
    get el(): T | null {
      return node.__refs__[name] || null;
    },
  };
}

export function useComponent() {
  return getCurrentNode().component;
}

export function useExternalListener(target, eventName, handler, eventParams?) {
  const node = getCurrentNode();
  const boundHandler = handler.bind(node.component);
  owl.onMounted(() => target.addEventListener(eventName, boundHandler, eventParams));
  owl.onWillUnmount(() => target.removeEventListener(eventName, boundHandler, eventParams));
}

function onWillRender(cb) {
  const node = getCurrentNode();
  const renderFn = node.renderFn;
  node.renderFn = () => {
    cb.call(node.component);
    return renderFn();
  };
}

export function useLayoutEffect(effect, computeDependencies: () => any = () => [NaN]) {
  /** @type {Function} */
  let cleanup;
  /** @type {any[]} */
  let dependencies;
  owl.onMounted(() => {
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
  owl.onPatched(() => {
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
  owl.onWillUnmount(() => cleanup && cleanup());
}

export class EnvPlugin extends owl.Plugin {
  static id = "__ENV__";
  env = owl.config("env") ?? {};
}

export function useEnv() {
  return getCurrentNode().component.env;
}

/**
 * @param {object} env
 */
function provideEnv(env) {
  owl.providePlugins([EnvPlugin], { env });
  return env;
}

/**
 * @param {object} extension
 */
function extendEnv(extension) {
  const env = useChildEnv();
  const subEnv = Object.create(env);
  Object.defineProperties(subEnv, Object.getOwnPropertyDescriptors(extension));
  return provideEnv(subEnv);
}

export function useSubEnv(extension) {
  const component = getCurrentNode().component;
  component.env = extendEnv(extension);
}

export function useChildSubEnv(extension) {
  extendEnv(extension);
}

export function useChildEnv() {
  return owl.plugin(EnvPlugin).env;
}

class VPortal extends owl.blockDom.text("").constructor {
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

class Portal extends owl.Component {
  static template = owl.xml`<t t-call-slot="default"/>`;
  static props = { selector: String, slots: true };

  setup() {
    const node = this.__owl__;
    const renderContent = node.renderFn;
    node.renderFn = (/** @type {any[]} */ ...args) =>
      new VPortal(node.props.selector, renderContent(...args));

    owl.onMounted(() => {
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

    owl.onWillUnmount(() => {
      const portal = node.bdom;
      portal.remove();
    });
  }
}

const customDirectives = {
  /**
   * @param {HTMLElement} node
   * @param {string} value
   */
  ref: (node, value) => {
    const refName = `"` + value.replaceAll(/\{\{(.+?)\}\}/g, `" + $1 + "`) + `"`;
    node.setAttribute("t-ref", `__globals__.createRefSignal(this, ${refName})`);
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
   */
  createRefSignal: (component, refName) => ({
    /** @param {HTMLElement | null} value */
    set(value) {
      if (!component.__owl__.__refs__) {
        component.__owl__.__refs__ = {};
      }
      component.__owl__.__refs__[refName] = value;
    },
  }),
  /**
   * @param {Function} getter
   * @param {Function} setter
   */
  createModelSignal: (getter, setter) => Object.assign(getter, { set: setter }),
  Portal,
};

export class App extends owl.App {
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
    this.pluginManager.startPlugins([EnvPlugin]);
    this.env = config.env ?? {};
  }

  createRoot(component, config = {}) {
    if (config.env) {
      component = class extends component {
        constructor(node) {
          provideEnv(config.env);
          super(node);
        }
      };
    }
    return super.createRoot(component, config);
  }
}
