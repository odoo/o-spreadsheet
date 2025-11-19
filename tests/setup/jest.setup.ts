/**
 * This file will be run before each test file
 */
import { App } from "@odoo/owl";
import * as Chart from "chart.js";
import { HEADER_HEIGHT, HEADER_WIDTH, setDefaultSheetViewSize } from "../../src/constants";
import "../../src/types/chart/chartjs_tree_map_type";
import { getCompiledTemplates } from "../../tools/owl_templates/compile_templates.cjs";
import {
  extendMockGetBoundingClientRect,
  mockGetBoundingClientRect,
} from "../test_helpers/mock_helpers";
import "./canvas.mock";
import "./jest_extend";
import "./polyfill";
import "./resize_observer.mock";
import { Resizers } from "./resize_observer.mock";
import { patchSessionMove } from "./session_debounce_mock";

window.Chart = Object.assign(Chart.Chart, Chart);

declare global {
  interface Window {
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

  HTMLDivElement.prototype.scrollTo = function (
    x: ScrollToOptions | undefined | number,
    y?: number
  ) {
    if (typeof x === "number" && typeof y === "number") {
      this.scrollTop = y;
      this.scrollLeft = x;
    } else if (typeof x === "object" && x !== null) {
      const options = x as ScrollToOptions;
      this.scrollTop = options["top"] ?? this.scrollTop;
      this.scrollLeft = options["left"] ?? this.scrollLeft;
    }
  };

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
  jest
    .spyOn(HTMLCanvasElement.prototype, "toBlob")
    .mockImplementation(function (callback: BlobCallback, type?: string) {
      const data = new Uint8Array(length);
      const blob = new window.Blob([data], { type });
      setTimeout(() => callback(blob), 0);
    });

  // offsetParent should return the nearest positioned ancestor, or null if an ancestor has `display: none`
  jest
    .spyOn(HTMLElement.prototype, "offsetParent", "get")
    .mockImplementation(function (this: HTMLElement) {
      for (let element: HTMLElement | null = this; element; element = element.parentElement) {
        if (getComputedStyle(element).display === "none" || element.classList.contains("d-none")) {
          return null;
        }
      }

      if (
        getComputedStyle(this).position === "fixed" ||
        this.classList.contains("position-fixed")
      ) {
        return null;
      }

      if (this.tagName.toLowerCase() in ["html", "body"]) {
        return null;
      }

      return this.parentElement; // should be nearest positioned ancestor, but simplified for tests
    });

  patchSessionMove();
});

beforeEach(() => {
  mockGetBoundingClientRect();
  extendMockGetBoundingClientRect({
    "o-spreadsheet": () => ({
      x: 0,
      y: 0,
      width: 1000 + HEADER_WIDTH,
      height: 1000 + HEADER_HEIGHT,
    }),
    "o-grid": () => ({ x: 0, y: 0, width: 1000 + HEADER_WIDTH, height: 1000 + HEADER_HEIGHT }),
    // "o-grid-overlay": () => ({ x: HEADER_WIDTH, y: HEADER_HEIGHT, width: 1000 + HEADER_WIDTH, height: 1000 + HEADER_HEIGHT }),
  });
});

// afterAll(() => {resetMockGetBoundingClientRect()});

afterEach(() => {
  window.resizers.removeAll();
  document.getSelection()?.removeAllRanges();
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
