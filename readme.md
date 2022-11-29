# o-spreadsheet

a.k.a. "Owly Sheet"

Spreadsheet component, written in Owl.

## Prerequisites

install nodejs 12.0 at least

## Scripts

```bash
# install dependencies
npm install

# build o_spreadsheet.js in dist/
npm run build

# build stuff, start a live server, build with --watch
npm run dev

# run the test suite
npm run test
npm run test -- --watch
```

## Code

Most of the code is contained in the following four modules:

- `formulas`
- `functions`
- `model`
- `ui`

## Documentation

See [documentation](doc/readme.md).

## Workflow

The repository relies on Github Workflows to automate the creation of releases
as well as publishing the package on NPM.

# test  the workflow
The workflow can be run locally with the help of https://github.com/nektos/act
Bear in mind that it is not a full sandbox, you can run actual commands (like
npm publish). Make sure you adapt said commands to dry runs.