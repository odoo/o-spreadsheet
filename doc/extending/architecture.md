# o-spreadsheet architecture

o-spreadsheet is architected in two main parts: the model and the spreadsheet rendering in the DOM.

## Model: commands and getters

It is the spreadsheet's dynamic data structure. It directly manages the data, logic and business rules.

The model architectural pattern is [command query separation](https://en.wikipedia.org/wiki/Command%E2%80%93query_separation).

You can interact with the model by two means:

### Commands

**commands** can update the spreadsheet state

```javascript
const model = new Model();

// Update A1's content by dispatching a command
model.dispatch("UPDATE_CELL", {
  col: 0,
  row: 0,
  sheetId: "1",
  content: "Hello world",
});
```

All existing commands are available in the file [https://github.com/odoo/o-spreadsheet/blob/18.0/src/types/commands.ts](src/types/commands.ts)

### Getters

**getter** functions allows to read the current state.

```javascript
// Read the cell content
const cell = model.getters.getCell(sheetId, col, row);
console.log(cell.content); // logs "Hello world"
```

Commands are handled internally by **plugins**.

### Plugins

A plugin can:

- have its own private state
- introduce new getters to make parts of its state available for other plugins or the user interface.
- react to any dispatched command

Plugins are decomposed in two categories: core and UI.

_Core plugins_ are responsible to manage data which is persisted (preserved when the user reloads the spreadsheet) such as cell content, user-defined style, chart definitions, etc. They also implement all associated business rules. Each plugin is responsible of one data structure.

_UI plugins_ are separated in three different sub-categories, with the following responsibility:

- _stateful UI plugins_ manage the ui state (active sheet, current selection, ...) (grep `statefulUIPluginRegistry`)
- _core view plugins_ use data from core plugins to derive another state. Example of such plugin is the evaluation plugins which reads the formulas in
  each cell and compute the result. (grep `coreViewsPluginRegistry`)
- _feature plugins_ handle high-level features that could be described with lower-level features (Sorting a zone can be described with different cell updates) (grep `featurePluginRegistry`). Those plugins typically don't have any state. They only dispatch sub-commands.

Each UI plugin is responsible of one feature.

More details about plugins here: [Adding a new feature](./business_feature.md)

## UI rendering

The grid itself is rendered on an HTML canvas.
All other elements are rendered with the [owl](https://github.com/odoo/owl) UI framework.
The UI is rendered after each command dispatched.
