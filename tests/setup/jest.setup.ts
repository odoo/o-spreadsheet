/**
 * This file will be run before each test file
 */
// @ts-ignore

import {
  HEADER_HEIGHT,
  HEADER_WIDTH,
  setDefaultSheetViewSize,
} from "@odoo/o-spreadsheet-engine/constants";
import "@odoo/o-spreadsheet-engine/types/chart/chartjs_tree_map_type";
import { App } from "@odoo/owl";
import * as Chart from "chart.js";
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

// Mock getCanvas for all imports
jest.mock("@odoo/o-spreadsheet-engine/helpers/text_helper", () => {
  const actual = jest.requireActual("@odoo/o-spreadsheet-engine/helpers/text_helper");
  return {
    ...actual,
    getCanvas: () => new (require("./canvas.mock").MockCanvasRenderingContext2D)(),
  };
});

jest.mock("@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common", () => {
  return {
    ...jest.requireActual("@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_ui_common"),
    chartToImageUrl: () => "data:image/png;base64,randomDataThatIsActuallyABase64Image",
  };
});

window.Chart = Object.assign(Chart.Chart, Chart);

declare global {
  interface Window {
    resizers: Resizers;
    Chart: typeof Chart.Chart;
  }
}

function registerOwlTemplates() {
  const templates = getCompiledTemplates();
  for (const tName in templates) {
    App.registerTemplate(tName, templates[tName]);
  }
}

class PointerEventPolyfill extends MouseEvent {
  pointerId: number;
  constructor(type: string, eventInitDict: PointerEventInit) {
    super(type, eventInitDict);
    this.pointerId = eventInitDict.pointerId ?? 0;
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

  // Not implemented in JSDOM
  Element.prototype.animate = jest.fn().mockReturnValue({
    finished: Promise.resolve(),
    addEventListener: () => {},
    removeEventListener: () => {},
  });

  // @ts-ignore
  window.PointerEvent = PointerEventPolyfill;
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
  // light-dark() colors are not supported in the color parser used by jsdom. Mock the setColor to avoid parsing color issues
  jest
    .spyOn(CSSStyleDeclaration.prototype, "color", "set")
    .mockImplementation(function (this: CSSStyleDeclaration, color: string) {
      // @ts-ignore
      this._setProperty("color", color);
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

  /** this is the magic shit
   * ensures that we properly load every files from the library but
   * this needs to happen after we mock the said files. Otherwise,
   * the functions that should be mocked will already have been imported
   * and linked to other functions, making them un-mockable
   */
  require("../../src");
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
