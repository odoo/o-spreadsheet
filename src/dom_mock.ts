// Mock implementation for environments without DOM (e.g., node.js, tests without jsdom).

if (typeof globalThis.OffscreenCanvas === "undefined") {
  class MockOffscreenCanvasRenderingContext2D {
    constructor() {
      return proxy(this);
    }

    save() {}
    restore() {}
    measureText(text: string) {
      return { width: text.length };
    }
  }
  class MockOffscreenCanvas {
    constructor(width: number, height: number) {
      return proxy(this);
    }
    getContext(contextId: string) {
      if (contextId === "2d") {
        return new MockOffscreenCanvasRenderingContext2D();
      }
      return null;
    }
  }

  function proxy<T extends object>(target: T): T {
    return new Proxy(target, {
      get: function (obj, prop, receiver) {
        if (Reflect.has(obj, prop)) {
          return Reflect.get(obj, prop, receiver);
        }
        throw new Error(
          `OffscreenCanvas mock: "${String(prop)}" is not implemented.\n` +
            `Add it to MockOffscreenCanvas or MockOffscreenCanvasRenderingContext2D if needed.`
        );
      },
    });
  }

  globalThis.OffscreenCanvas = MockOffscreenCanvas as typeof OffscreenCanvas;
}

if (typeof globalThis.DOMParser === "undefined") {
  globalThis.DOMParser = class DOMParser {
    parseFromString() {
      return {
        querySelector() {
          return null;
        },
        querySelectorAll() {
          return [];
        },
        body: {},
      };
    }
  } as unknown as typeof DOMParser;
}
if (typeof globalThis.document === "undefined") {
  const noop = function () {};

  globalThis.document = {
    implementation: {
      createDocument() {
        return {};
      },
    },
    addEventListener: noop,
    removeEventListener: noop,
    querySelectorAll() {
      return [];
    },
    querySelector() {
      return null;
    },
    createElement() {
      return {
        setAttribute() {},
        getBoundingClientRect() {
          return { width: 0, height: 0 };
        },
      };
    },
    createTextNode() {
      return {};
    },
    cookie: "",
    head: {
      querySelectorAll() {
        return [];
      },
    },
    body: {
      classList: { add: noop, remove: noop, contains: noop },
      contains() {
        return false;
      },
      appendChild() {},
      removeChild() {},
    },
  } as unknown as Document;
}
