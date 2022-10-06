# o-spreadsheet

Standalone spreadsheet for the web, easily integrable and extendable.

## Supported features

Here is a non-exhaustive list of features supported by o-spreadsheet:

- All basic features you can expect from a spreadsheet
- Real time collaboration
- Import/Export of excel file format

## Integrating o-spreadsheet

1. [Getting started](doc/integrating/integration.md#getting-started)
2. [Spreadsheet component props](doc/integrating/integration.md#spreadsheet-component-props)
3. [Model creation](doc/integrating/integration.md#model-creation)
4. [Collaborative edition](doc/integrating/integration.md#collaborative-edition)
5. [Translation](doc/integrating/integration.md#translation)
<!--

- use with other UI library
- use with Typescript
  -->

## Extending the functionalities of o-spreadsheet

1. [Architecture](doc/extending/architecture.md)
2. [Custom function](doc/add_function.md)
3. [Business feature](doc/extending/business_feature.md)
4. [Menu items]()
5. [Side panel]()
6. [Notification]()
7. [Import Excel]()
8. [Export Excel](doc/extending/xlsx/xlsx_import.md)
9. [Terminology](doc/o-spreadsheet_terminology.png)
10. [API](doc/tsdoc/README.md)

## Scripts

```bash
# install dependencies
npm install

# build o_spreadsheet.js in dist/
npm run build

# build stuff, start a live server, start a collaborative server, build with --watch
npm run dev

# run the test suite
npm run test
npm run test -- --watch

# build documentation
npm run doc
```

## Documentation

See [documentation](doc/readme.md).
