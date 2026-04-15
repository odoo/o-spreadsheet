import { writeTemplatesToFile } from "../../tools/owl_templates/compile_templates.cjs";
import { deleteCompiledTemplatesFile } from "../../tools/owl_templates/compile_templates.cjs";

export function setup() {
  writeTemplatesToFile();
}

export function teardown() {
  deleteCompiledTemplatesFile();
}
