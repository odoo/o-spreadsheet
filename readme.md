# o_spreadsheet

Spreadsheet component, written in Owl.

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

- `components`
- `formulas`
- `functions`
- `model`

Among these modules, we have the following dependencies:

- `function` has no dependency
- `formulas` depends on `functions`
- `model` depends on `formulas`
- `components` depends on `model` and `formulas`

## Documentation

See [documentation](doc/readme.md).