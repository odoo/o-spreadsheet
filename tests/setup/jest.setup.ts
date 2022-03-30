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
