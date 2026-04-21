import {
  deleteCompiledTemplatesFile,
  writeTemplatesToFile,
} from "../../tools/owl_templates/compile_templates.cjs";

export default function setup(project) {
  writeTemplatesToFile();

  return function teardown() {
    deleteCompiledTemplatesFile();
  };
}
