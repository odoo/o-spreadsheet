/**
 * This file will be run before each test file
 */
// @ts-ignore
import "../../src/registries/chart_types";

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
import { patchSessionMove } from "./session_debounce_mock";
// import { MockCanvasRenderingContext2D } from "./canvas.mock";
// import * as textHelpers from "@odoo/o-spreadsheet-engine/helpers/text_helper";

// Mock getCanvas for all imports
jest.mock("@odoo/o-spreadsheet-engine/helpers/text_helper", () => {
  const actual = jest.requireActual("@odoo/o-spreadsheet-engine/helpers/text_helper");
  return {
    ...actual,
    getCanvas: () => new (require("./canvas.mock").MockCanvasRenderingContext2D)(),
  };
});

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
