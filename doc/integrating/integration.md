# Integrating o-spreadsheet in an existing owl application

## Getting Started

Here is the shortest example to use o-spreadsheet.

```typescript
const { Spreadsheet, Model } = o_spreadsheet;

const model = new Model();
const templates = await(await fetch("../dist/o_spreadsheet.xml")).text();
const app = new owl.App(Spreadsheet, {
  props: {
    model,
    // optionals
    notifyUser: () => window.alert(content),
    askConfirmation: (message, confirm, cancel) => window.confirm(message),
    raiseError: (content, callback) => {
      window.alert(content);
      callback?.();
    },
  },
  {},
  templates,
});
app.mount(document.body);
```

## Spreadsheet component props

Spreadsheet component takes the following props:

**required**:

- `model`
  The spreadsheet model to be used with the component.

**optional**:

- `notifyUser`
  A function used to notify the user. It supports several levels of severity as well as a sticky behaviour.
  See its [`interface`](../../src/types/env.ts#L15)
- `askConfirmation`
  A function used to ask the user confirmation before applying a callback
- `raiseError`
  A function to warn the user when a manipulation error occurs.

The optional props should implement [`NotificationStoreMethods`](../../src/stores/notification_store.ts#L3).

## Model creation

Spreadsheet model can be created with the following arguments, all optionals:

```ts
const { Model } = o_spreadsheet;
const model = new Model(data, config);
```

- `data`
  Data to be loaded in the model. If this argument is not provided, an empty spreadsheet is created.

- `config` A config object with the following properties, all optionals:

  - `mode` The mode in which the spreadsheet is run: `normal`, `readonly` or `dashboard`.
  - `custom` Any custom external dependencies your custom plugins or functions might need.
    They are available in plugins config and functions evaluation context.
  - `external`: External dependencies required to enable some features such as uploading images.
  - [`transportService`](../integrating/collaborative/collaborative.md) Service which ensure the communication in a collaborative context
  - `client` Client information (name, id). Used in collaborative context to indicate the positions of all clients.
  - `defaultCurrencyFormat`: currency format proposed in the menu. e.g. `"[$€]#,##0.00"` for Euro (defaults to `"[$$]#,##0.00"`)
  - `snapshotRequested` Boolean that set to true will indicate to the session that a snapshot has to be done after the loading of revisions.
  - `notifyUI` Function that will be called whenever something has to be asked to the user.

- `stateUpdateMessages`
  An array with revisions to apply before the model is started

## Collaborative edition

See [collaborative documentation](../integrating/collaborative/collaborative.md)

## Translation

To translate terms in o-spreadsheet, a translate function can be passed to o_spreadsheet.
This function should take a string and returns the translated string.

```typescript
function _t(term) {
  return translate(term);
}

o_spreadsheet.setTranslationMethod(_t);
```

## Image server

Enable the image insertion feature by providing an external file store to store images.
Your file store instance should implements the [`FileStore`](https://github.com/odoo/o-spreadsheet/blob/b4c1339c82c3831e76636851116fbf754946ea79/src/types/files.ts#L6) interface.

```ts
const fileStore = new MyFileStore(...);

const model = new Model(data, {
  external: {
    fileStore,
  },
});
```

## Custom currency formats

Enable the custom currency format feature by providing an external access to your currencies.
Your function loading the currencies should return a [`Currency`](https://github.com/odoo/o-spreadsheet/blob/b4c1339c82c3831e76636851116fbf754946ea79/src/types/currency.ts) array.

```ts
async function loadCurrencies() {
  // currencies can be loaded from anywhere, including an external server or a local file.
  return [
    { name: "Pound sterling", code: "GBP", symbol: "£", position: "after", decimalPlaces: 2 },
    { name: "South Korean won", code: "KRW", symbol: "₩", position: "after", decimalPlaces: 1 },
    { name: "Swedish krona", code: "SEK", symbol: "kr", position: "after", decimalPlaces: 2 },
  ];
}

const model = new Model(data, {
  external: {
    loadCurrencies,
  },
});
```

## External Locales

You can add more locales in the spreadsheet options by providing access to your locales with the model
config `loadLocales`. Your function loading the locales should return a [`Locale`](/src/types/locale.ts) array.

```ts
const locale = {
    name: "English (US)",
    code: "en_US",
    thousandsSeparator: ",",
    decimalSeparator: ".",
    weekStart: 7, //1 = Monday, 7 = Sunday
    dateFormat: "m/d/yyyy",
    timeFormat: "hh:mm:ss a",
    formulaArgSeparator: ",",
}

async function loadLocales() {
  // locales can be loaded from anywhere, including an external server or a local file.
  return [ locale, locale2, ...];
}

const model = new Model(data, {
  external: {
    loadLocales,
  },
});
```

## Managing application state with stores

See [Managing application state with stores](/src/store_engine/README.md)
