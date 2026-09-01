# Adding a new feature

Adding a feature is done by adding one or more plugins.

In this page, we will go through the steps of creating a new feature, with a dummy
example : `Party` mode. This mode could be
toggle from a top bar menu. When enable, this mode will display a text `PARTY`
in all cells which contains the content `party`.

## Plugin creation

A plugin should extend `CorePlugin`, `EvaluationPlugin` or `UIPlugin` depending on its role.
The plugin should also be registered in the registry matching its base class, in order to load
it at the model startup (`corePluginRegistry`, `evaluationPluginRegistry`, `statefulUIPluginRegistry`
or `featurePluginRegistry` — registering a plugin in a registry expecting another base class throws).
More details about plugins can be found in the [plugin section](plugin.md)

In our example, we will create three plugins: a new `CorePlugin` which will manage
wether the party mode is active, a new `EvaluationPlugin` which will tell, for a given
cell, if it should party (this depends on the _evaluated_ content of the cell, which is
derived data), and a new `UIPlugin` that will be responsible to draw the `PARTY` text.

```typescript
const { CorePlugin, EvaluationPlugin, UIPlugin } = o_spreadsheet;

class PartyPlugin extends CorePlugin {}

class PartyEvaluationPlugin extends EvaluationPlugin {}

class PartyDrawerPlugin extends UIPlugin {}

// Register the plugins in order to load them at the model startup
corePluginRegistry.add("party_plugin", PartyPlugin);
evaluationPluginRegistry.add("party_evaluation_plugin", PartyEvaluationPlugin);
statefulUIPluginRegistry.add("party_drawer_plugin", PartyDrawerPlugin);
```

## Adding an internal state

The plugin can have an internal state.

Here, we add an internal state for our plugin

```typescript
class PartyPlugin extends CorePlugin {
  readonly isPartyModeEnabled: boolean = false;
}
```

The state must be updated with `this.history.update` function for the changes to be recorded in the history system (undo/redo). It cannot be changed in any other way!
A good practice is to declare the state readonly.

Data should be persisted via the `import`/`export` functions.

```typescript
class PartyPlugin extends CorePlugin {
  readonly isPartyModeEnabled: boolean = false;

  import(data) {
    this.history.update("isPartyModeEnabled", data.isPartyModeEnabled);
  }

  export(data) {
    data.isPartyModeEnabled = this.isPartyModeEnabled;
  }
}
```

Hint: `this.history` can be used with multiple level of depth:

```typescript
  class DummyPlugin extends CorePlugin {
    readonly records = {
      1: {
        data: {
          1: {
            text: "hello"
          }
        }
      }
    };

    // Replace "hello" by "Bye"
    this.history.update("records", 1, "data", 1, "text", "Bye");

    // Add a new object in data
    this.history.update("records", 1, "data", 2, { text: "Here" });

    // Remove entry 1 of data
    this.history.update("records", 1, "data", undefined);
  }
```

## Reading the state

The plugin can introduce new public getters to make parts of its state available for other plugins or the user interface.

A getter method should only **read** data and **never write** anything in the plugin's state nor dispatch any command. In other words, it shouldn't have any side-effect!

```typescript
class PartyPlugin extends CorePlugin {
  static getters = ["isPartyMode"]; // declare the method as a getter.

  // getter to check if the party mode is enabled
  isPartyMode(): boolean {
    return this.isPartyModeEnabled;
  }
}
```

## Updating the state

The plugin can handle a command and react to it in order to update its internal
state. Here we introduce a new command `"TOGGLE_PARTY_MODE"`. More details about adding
a new command are explained in the [command section](command.md)

```typescript
const { coreTypes } = o_spreadsheet;

coreTypes.add("TOGGLE_PARTY_MODE"); // declare the command as a core command

class PartyPlugin extends CorePlugin {
  handle(cmd) {
    switch (cmd.type) {
      case "TOGGLE_PARTY_MODE":
        // Ensure the change is historized (undo-able and redo-able), using `this.history`.
        this.history.update("isPartyModeEnabled", !this.isPartyModeEnabled);
        break;
    }
  }
}
```

The plugin can also react to commands from other plugins. Let's way want to automatically enable party mode when the user sets the content of a cell to `"party"`. We can handle the existing `UPDATE_CELL` command.

```typescript
class PartyPlugin extends CorePlugin {
  handle(cmd) {
    switch (cmd.type) {
      case "TOGGLE_PARTY_MODE":
        ...
        break;
      case "UPDATE_CELL":
        if (cmd.content === "party") {
            this.history.update("isPartyModeEnabled", true);
        }
        break;
    }
  }
}
```

## Computing derived state

Our core plugin knows whether the party mode is enabled, but it doesn't know which cells
should party. A cell contains `party` if the user typed it, but also if a formula
such as `=IF(A1>10, "party", "")` _evaluates_ to it. This is derived data: it depends on the
evaluation of the cells, it is recomputed by every client from the same core data, and it is
never persisted nor sent to other collaborators. This is exactly the job of an `EvaluationPlugin`.

An evaluation plugin has access to the core getters **and** to the evaluation getters
(`getEvaluatedCell`, ...), but not to the UI getters. It cannot change the model data: the only
commands it is allowed to dispatch are the evaluation commands (`EVALUATE_CELLS`, ...).

```typescript
class PartyEvaluationPlugin extends EvaluationPlugin {
  static getters = ["isPartyCell"];

  // a getter to know if a cell should party
  isPartyCell(position: CellPosition): boolean {
    if (!this.getters.isPartyMode()) {
      return false;
    }
    // `getEvaluatedCell` is an evaluation getter: it gives the *result* of the cell,
    // whether its content is a literal or a formula.
    return this.getters.getEvaluatedCell(position).value === "party";
  }
}
```

Its state is not historized: an evaluation plugin never uses `this.history.update`, it assigns its
state directly. It also has no `import`/`export`: the state is rebuilt from the core data.

The counterpart is that the plugin is responsible for invalidating what it derived, by handling the
commands that make its state obsolete. This is typically used to cache expensive computations.
Let's cache the result of `isPartyCell`:

```typescript
const { invalidateEvaluationCommands } = o_spreadsheet;
const { PositionMap } = o_spreadsheet.helpers;

class PartyEvaluationPlugin extends EvaluationPlugin {
  static getters = ["isPartyCell"];

  private partyCells = new PositionMap<boolean>();

  handle(cmd) {
    // any command invalidating the evaluation, and any command changing the party mode,
    // invalidates what we computed.
    if (
      invalidateEvaluationCommands.has(cmd.type) ||
      cmd.type === "UPDATE_CELL" ||
      cmd.type === "EVALUATE_CELLS" ||
      cmd.type === "TOGGLE_PARTY_MODE"
    ) {
      this.partyCells = new PositionMap();
    }
  }

  isPartyCell(position: CellPosition): boolean {
    let isParty = this.partyCells.get(position);
    if (isParty === undefined) {
      isParty = this.computeIsPartyCell(position);
      this.partyCells.set(position, isParty);
    }
    return isParty;
  }

  private computeIsPartyCell(position: CellPosition): boolean {
    return this.getters.isPartyMode() && this.getters.getEvaluatedCell(position).value === "party";
  }
}
```

Note that forgetting to invalidate the cache leaves the UI with stale content, while invalidating
too broadly only costs a recomputation: when in doubt, invalidate.

## Rendering

As our core plugin is now able to handle its proper state, and our evaluation plugin exposes
which cells should party, we need a way to reflect this state in the UI. This can be done with
mainly two different ways:

- Using the `drawLayer` method on UIPlugin

This method will be called in order to draw content directly on the canvas.

- Using a getter in a new component (Side panels, menu item, ...)

This method is explained [here](./ui_extension.md)

The layers the plugin draws on are declared with the static `layers` property, and `drawLayer` is
called once per declared layer. The UI plugin has access to every getter, including `isPartyCell`
exposed by our evaluation plugin: it only has to draw, all the logic stays in the model.

```typescript
const { positionToZone } = o_spreadsheet.helpers;

class PartyDrawerPlugin extends UIPlugin {
  static layers = ["Headers"];

  drawLayer(renderingContext: GridRenderingContext) {
    const { ctx, viewports, sheetId } = renderingContext;
    ctx.font = "12px Roboto";
    ctx.fillStyle = "#FF00FF";
    ctx.textBaseline = "middle";
    for (const position of viewports.getVisibleCellPositions(sheetId)) {
      if (!this.getters.isPartyCell(position)) {
        continue;
      }
      const { x, y, height } = viewports.getVisibleRect(sheetId, positionToZone(position));
      ctx.fillText("PARTY", x + 2, y + height / 2);
    }
  }
}
```
