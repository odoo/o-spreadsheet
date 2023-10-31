# Tests

o-spreadsheet is a well tested library with a plethora of tests, using the Jest testing framework.

## Running tests

```bash
# install dependencies
npm install
# run the test suite
npm run test
```

## Writing tests guidelines

- Tests should be located in `tests/` folder.
- Test files should be suffixed by `.test.ts` (eg. `my_feature.test.ts`)
- Test file name should be suffixed by `_component` or `_plugin` where this is relevant.
  - this means that a feature should split into separate files testing the components and the plugins
- Test files for the same feature should be grouped inside a single folder

Example:

```
tests/
├─ find_and_replace/
│  ├─ find_and_replace_plugin.test.ts
│  ├─ find_and_replace_component.test.ts
├─ readme.md
```

## Owl Templates

In an effort to run the tests faster, we pre-compile the owl templates before running the tests. This is done by running the `compileOwlTemplates` script in the `package.json` file. This script compiles all the owl templates in the `src` folder into the `tools/owl_templates/_compiled/owl_compiled_templates.cjs` file.
