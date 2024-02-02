# Adding a new feature

Adding a feature is done by adding one or more plugins.

In this page, we will go through the steps of creating a new feature, with a dummy
example : `Party` mode. This mode could be
toggle from a top bar menu. When enable, this mode will display a text `PARTY`
in all cells which contains the content `party`.

## Plugin creation

A plugin should extend either `CorePlugin` or `UIPlugin` depending on its role.
The plugin should also be register in the registry of plugins, in order to load
it at the model startup. (`corePluginRegistry` or `uiPluginRegistry`). Mode details
about plugins can be found in the [plugin section]("plugin.md)

In our example, we will create two plugins, a new `CorePlugin` which will manage
wether the party mode is active, and a new `UIPlugin` that will be responsible
to draw the `PARTY` text.

```typescript
const { CorePlugin, UIPlugin } = o_spreadsheet;

class PartyPlugin extends CorePlugin {}

class PartyDrawerPlugin extends UIPlugin {}

// Register the plugins in order to load it at the model startup
corePluginRegistry.add("party_plugin", PartyPlugin);
uiPluginRegistry.add("party_drawer_plugin", PartyDrawerPlugin);
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

## Rendering

As our core plugin is now able to handle its proper state, we need a way to reflect this state in the UI. This can be done with mainly two different ways:

- Using the `drawLayer` method on UIPlugin

This method will be called in order to draw content directly on the canvas.

- Using a getter in a new component (Side panels, menu item, ...)

This method is explained [here](./ui_extension.md)

```typescript
class PartyDrawerPlugin extends UIPlugin {

  drawLayer(renderingContext: GridRenderingContext, layer: LAYERS) {
    if (layer === LAYERS.Headers) {
      // TODO
      for (const cell of )
    }
  }
}
```
