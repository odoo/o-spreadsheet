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
    //@ts-ignore
    this.props = owl.props(null, this.constructor.defaultProps);
    this.env = useChildEnv();
    this.__owl__ = node;
    currentNode = node;
  }

  setup() {}

  render(deep = false) {
    this.__owl__.render(deep === true);
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

export function useLayoutEffect(effect, computeDependencies: () => any = () => [NaN]) {
  /** @type {Function} */
  let cleanup;
  /** @type {any[]} */
  let dependencies;
  owl.onMounted(() => {
    dependencies = computeDependencies();
    cleanup = effect(...dependencies);
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
  const subEnv = Object.assign(Object.create(env), extension);
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
