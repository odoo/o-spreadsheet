/**
 * This file will be run before each test file
 */
import { getParsedOwlTemplateBundle } from "../../tools/bundle_xml/bundle_xml_templates";
import "./canvas.mock";
import "./jest_extend";

export let OWL_TEMPLATES: Document;
beforeAll(async () => {
  OWL_TEMPLATES = await getParsedOwlTemplateBundle();
});

beforeEach(() => {
  jest
    .spyOn(HTMLDivElement.prototype, "clientHeight", "get")
    .mockImplementation(function (this: HTMLDivElement) {
      const grid = this.className.includes("o-grid");
      if (grid) {
        return 1000;
      }
      return 0;
    });
  jest
    .spyOn(HTMLDivElement.prototype, "clientWidth", "get")
    .mockImplementation(function (this: HTMLDivElement) {
      if (this.className.includes("o-grid")) {
        return 1000;
      }
      return 0;
    });
});
