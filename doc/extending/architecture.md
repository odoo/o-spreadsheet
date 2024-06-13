# o-spreadsheet architecture

o-spreadsheet is architected in two main parts: the model and the spreadsheet rendering in the DOM.

## Model: commands and getters

It is the spreadsheet's dynamic data structure. It directly manages the data, logic and business rules.

The model architectural pattern is [command query separation](https://en.wikipedia.org/wiki/Command%E2%80%93query_separation).

You can interact with the model by two means:

### Commands

**commands** can update the spreadsheet state

```javascript
const col = 0;
const row = 0;
const sheetId = "1";

const model = Model.BuildSync();

// Update A1's content by dispatching a command
model.dispatch("UPDATE_CELL", {
  col,
  row,
  sheetId,
  content: "Hello world",
});
```

All existing commands are available [https://github.com/odoo/o-spreadsheet/blob/16.0/src/types/commands.ts#L906](here)

### Getters

**getter** functions allows to read the current state.

```javascript
// Read the cell content
const cell = model.getters.getCell(sheetId, col, row);
console.log(cell.content); // Will display "Hello world"
```

Commands are handled internally by **plugins**.

### Plugins

A plugin can:

- have its own private state
- introduce new getters to make parts of its state available for other plugins or the user interface.
- react to any dispatched command

Plugins are decomposed in two parts: core and UI.

Core plugins are responsible to manage the data persistence and all associated business rules (cell content, user-defined style, chart definitions, ...). Each plugin is responsible of one data structure.

UI plugins are separated in three different categories, with the following responsibility:

- Manage the ui state (active sheet, current selection, ...)
- Manage the derived state from the core part (cell evaluation, computed style, ...)
- Handle high-level features that could be described with lower-level features (Sort a zone can be described with different cell updates)

Each UI plugin is responsible of one feature.

More details about plugins here: [Adding a new feature](./business_feature.md)

## UI rendering

The grid itself is rendered on an HTML canvas.
All other elements are rendered with the [owl](https://github.com/odoo/owl) UI framework.
The UI is rendered after each command dispatched on the model with the help of the getters.
