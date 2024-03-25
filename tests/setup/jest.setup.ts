/**
 * This file will be run before each test file
 */
import { setDefaultSheetViewSize } from "../../src/constants";
import { getParsedOwlTemplateBundle } from "../../tools/bundle_xml/bundle_xml_templates";
import "./canvas.mock";
import "./jest_extend";
import "./resize_observer.mock";

export let OWL_TEMPLATES: Document;

beforeAll(() => {
  OWL_TEMPLATES = getParsedOwlTemplateBundle();
  setDefaultSheetViewSize(1000);
  Object.defineProperty(Element.prototype, "innerText", {
    get: function myProperty() {
      return this.textContent;
    },
    set: function myProperty(value) {
      this.textContent = value;
      this.innerHTML = value;
    },
  });
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
