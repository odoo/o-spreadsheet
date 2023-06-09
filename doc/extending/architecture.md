# o-spreadsheet Architecture

The architecture of o-spreadsheet consists of two main components: the spreadsheet engine called the _model_ and the UI which renders the model to the DOM.

## Model: Commands and Getters

The model represents the dynamic data structure of the spreadsheet. It directly handles the data, logic, and business rules.

The model follows the architectural pattern of **[command query separation](https://en.wikipedia.org/wiki/Command%E2%80%93query_separation)**, which separates commands that update the spreadsheet's state from queries that retrieve the current state.

There are two ways to interact with the model:

### Getters

**Getters** are functions that allow you to read the current state of the spreadsheet.

```ts
import { Model } from "@odoo/o-spreadsheet";

const model = new Model();

// Get the active sheet id
const sheetId = model.getters.getActiveSheetId();

// Read cell A1
const A1 = model.getters.getCell(sheetId, 0, 0);
```

`A1` is currently `undefined` because the spreadsheet is empty.
Let's add something to A1 with a command.

### Commands

**Commands** are used to update the state of the spreadsheet.

Let's update the content of cell A1 by dispatching a command

```ts
model.dispatch("UPDATE_CELL", {
  col: 0,
  row: 0,
  sheetId,
  content: "Hello world",
});

// now A1 is no longer undefined
const A1 = model.getters.getCell(sheetId, 0, 0);
console.log(A1.content); // displays "Hello world"
```

You can find all the available commands [here](https://github.com/odoo/o-spreadsheet/blob/saas-16.3/src/types/commands.ts#L906).

Commands are internally handled by **plugins**.

### Plugins

A plugin can:

- Have its own private state.
- Introduce new getters to make parts of its state available to other plugins or the UI.
- React to any dispatched command.

Plugins are divided into two parts: core and UI.

Core plugins are responsible for managing data persistence and associated business rules such as cell content, user-defined styles, chart definitions, etc. Each plugin is responsible for a specific data structure.

UI plugins are categorized into three types with the following responsibilities:

- Manage the UI state (active sheet, current selection, etc.).
- Manage derived state from the core part (cell evaluation, computed styles, etc.).
- Handle high-level features that can be composed of lower-level features (e.g., sorting a range can be described as a sequence of different cell updates).

Each UI plugin is dedicated to a specific feature.

For more details about plugins, refer to [Adding a New Feature](./business_feature.md).

## UI Rendering

The grid itself is rendered using an HTML canvas, while other elements are rendered using the [owl](https://github.com/odoo/owl) UI framework. The UI is updated after each command dispatched to the model, using the getters to retrieve the necessary information.
