/**
 * This file will be run before each test file
 */
import { App } from "@odoo/owl";
import { setDefaultSheetViewSize } from "../../src/constants";
import { getCompiledTemplates } from "../../tools/owl_templates/compile_templates.cjs";
import { ContentEditableHelper } from "../__mocks__/content_editable_helper";
import "./canvas.mock";
import "./jest_extend";
import "./polyfill";
import "./resize_observer.mock";
import { Resizers } from "./resize_observer.mock";

declare global {
  interface Window {
    mockContentHelper: ContentEditableHelper;
    resizers: Resizers;
  }
}

function registerOwlTemplates() {
  const templates = getCompiledTemplates();
  for (const tName in templates) {
    App.registerTemplate(tName, templates[tName]);
  }
}

beforeAll(() => {
  registerOwlTemplates();
  setDefaultSheetViewSize(1000);
  Object.defineProperty(Element.prototype, "innerText", {
    get: function () {
      return this.textContent;
    },
    set: function (value) {
      this.textContent = value;
      this.innerHTML = value;
    },
  });

  console.debug = () => {};
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
  window.resizers.removeAll();
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
