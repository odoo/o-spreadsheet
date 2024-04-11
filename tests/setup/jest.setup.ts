/**
 * This file will be run before each test file
 */
import { App } from "@odoo/owl";
import { setDefaultSheetViewSize } from "../../src/constants";
import { setTranslationMethod } from "../../src/translation";
import { getCompiledTemplates } from "../../tools/owl_templates/compile_templates.cjs";
import "./canvas.mock";
import "./jest_extend";
import "./resize_observer.mock";

function registerOwlTemplates() {
  const templates = getCompiledTemplates();
  for (const tName in templates) {
    App.registerTemplate(tName, templates[tName]);
  }
}

beforeAll(() => {
  registerOwlTemplates();
  setDefaultSheetViewSize(1000);
  setTranslationMethod(
    (str, ...values) => str,
    () => true
  );
  Object.defineProperty(Element.prototype, "innerText", {
    get: function () {
      return this.textContent;
    },
    set: function (value) {
      this.textContent = value;
      this.innerHTML = value;
    },
  });

  console.info = () => {};
  console.group = () => {};
  console.groupEnd = () => {};
});

beforeEach(() => {
  jest
    .spyOn(HTMLDivElement.prototype, "clientHeight", "get")
    .mockImplementation(function (this: HTMLDivElement) {
      const grid = this.className.includes("o-grid-overlay");
      if (grid) {
        return 985;
      }
      return 0;
    });
  jest
    .spyOn(HTMLDivElement.prototype, "clientWidth", "get")
    .mockImplementation(function (this: HTMLDivElement) {
      if (this.className.includes("o-grid-overlay")) {
        return 985;
      }
      return 0;
    });
});

afterEach(() => {
  //@ts-ignore
  global.resizers.removeAll();
  executeCleanups();
});

const cleanUps: (() => void)[] = [];

export function registerCleanup(cleanupFn: () => void) {
  cleanUps.push(cleanupFn);
}

function executeCleanups() {
  let cleanupFn: (() => void) | undefined;
  while ((cleanupFn = cleanUps.pop())) {
    cleanupFn();
  }
}

let error = null;

beforeEach(() => {
  error = null;
  jest.spyOn(console, "error").mockImplementation((e) => {
    error = e;
  });
  jest.spyOn(console, "warn").mockImplementation((e) => {
    error = e;
  });
});

afterEach(() => {
  if (error) {
    throw error;
  }
});

//@ts-ignore
Object.groupBy ??= function (values, keyFinder) {
  // using reduce to aggregate values
  //@ts-ignore
  return values.reduce((a, b) => {
    // depending upon the type of keyFinder
    // if it is function, pass the value to it
    // if it is a property, access the property
    //@ts-ignore
    const key = typeof keyFinder === "function" ? keyFinder(b) : b[keyFinder];

    // aggregate values based on the keys
    if (!a[key]) {
      a[key] = [b];
    } else {
      a[key] = [...a[key], b];
    }

    return a;
  }, {});
};
