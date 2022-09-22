# Integrating o-spreadsheet in an existing owl application

## Getting Started

Here is the shortest example to use o-spreadsheet in an Owl application:

```typescript
const { Component } = owl;
const { Spreadsheet, Model } = o_spreadsheet;

class App extends Component {
   static template = xml`
      <Spreadsheet model="model"/>
   `;

   private model: Model = new Model();
}
App.components = { Spreadsheet };
```

## Spreadsheet component props

Spreadsheet component takes the following props:

- `model`
  The spreadsheet model to be used with the component.

- `exposeSpreadsheet` (function, optional)

Sometimes it could be necessary to access the component instance outside of the component, notably in tests. This function is a callback that will be called by the component, with itself as argument.

- `onUnexpectedRevisionId` (function, optional)

In collaborative context, it could happen that an unexpected revision is received, notably when the user is de-synchronized. This function will be called when a such revision is received.

## Model creation

Spreadsheet model can be created with the following arguments, all optionals:

- `data`

Data to be loaded in the model. If this argument is not provided, an empty spreadsheet is created.

- `config` A config object with the following properties, all optionals:

  - `mode` The mode in which the spreadsheet is run: `normal`, `readonly` or `dashboard`.
  - `evalContext` Object which is transmitted and made available while evaluating functions
  - `transportService` Service which ensure the communication in a collaborative context
  - `client` Client information (name, id). Used in collaborative context to indicate the positions of all clients.
  - `snapshotRequested` Boolean that set to true will indicate to the session that a snapshot has to be done after the loading of revisions.
  - `notifyUI` Function that will be called whenever something has to be asked to the user.

- `stateUpdateMessages`

An array with revisions that should be loaded at the model creation.

## Collaborative edition

See [collaborative documentation](collaborative.md)

## Translation

To translate terms in o-spreadsheet, a translate function can be passed to o_spreadsheet.
This function should take a string and returns the translated string.

```typescript
function _t(term) {
  return translate(term);
}

o_spreadsheet.setTranslationMethod(_t);
```
