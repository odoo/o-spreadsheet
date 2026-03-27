const { EnvPlugin } = o_spreadsheet.compatibility;

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
          super(node);
          this.env = provideEnv(config.env);
        }
      };
    }
    return super.createRoot(component, config);
  }
}
