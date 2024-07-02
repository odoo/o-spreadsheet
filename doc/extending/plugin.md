- [Plugins](#plugins)
  - [Plugin skeleton](#plugin-skeleton)
  - [Dispatch lifecycle and methods](#dispatch-lifecycle-and-methods)
    - [`allowDispatch`](#allowdispatch)
    - [`beforeHandle`](#beforehandle)
    - [`handle`](#handle)
    - [`finalize`](#finalize)
  - [Changes that can be undone and redone](#changes-that-can-be-undone-and-redone)
  - [Custom external dependency](#custom-external-dependency)

# Plugins

A plugin is a way for o-spreadsheet to organize features in such a way that they do not interfere with one another.

A plugin can :

- have its own state
- define its own getters to make parts of its state available for other plugins, for the user interface or to use in formula
  functions
- react to any existing command

Plugins are divided into two main categories: CorePlugin and UIPlugin, with each category featuring two specific types.

### I. CorePlugin

- manages data that is persistent
- can make changes to its state using the history interface (allowing `undo` and `redo`)
- import and export its state to be stored in the o-spreadsheet file

Core plugins include:

1. Core Plugins: manage data persistence
2. Core views Plugins: have a derived state from core data

### II. UIPlugin

- manages transient state, user specific state and everything that is needed to display the spreadsheet without changing the persistent data (like evaluation)

UI plugins include:

1. Stateful Plugins: have a state, but which should not be shared in collaborative
2. Feature Plugins: handle a specific feature, without handling any core commands

## Plugin skeleton

```typescript
const { CorePlugin } = o_spreadsheet;

class MyPlugin extends CorePlugin {
  readonly myPluginState = { firstProp: "hello" };
  readonly currentSomething = "";

  // ---------------------------------------------------------------------
  // Command handling
  // ---------------------------------------------------------------------

  handle(cmd) {
    // every plugin handle every commands, but most plugins only care for some commands.
    switch (cmd.type) {
      case "DO_SOMETHING":
        this.history.update("myPluginState", "firstProp", cmd.toPutInFirstProp);
        break;
    }
  }

  // ---------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------

  getSomething() {
    return this.myPluginState.firstProp;
  }

  // ---------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------
  import(data: WorkbookData) {
    // The import method is called on each plugin in order of the pluginRegistry,
    // that means that during the import, you cannot call a getter on a plugin that has not yet been imported (it doesn't have its data yet)
    // `data` is a json object that contains the entire data of the previously saved spreadsheet
    this.myPluginState = data.myPlugin;
  }

  export(data: WorkbookData) {
    // here set information that this plugin controls on the `data` object
    data.myPlugin = this.myPluginState;
  }
}

// makes the function getSomething accessible from anywhere that has a reference to model.getters
MyPlugin.getters = ["getSomething"];

// add the new "MyPlugin" to the plugin registry.
// It will be automatically instantiated by o-spreadsheet when you mount the spreadsheet component or when you create a new Model()
const pluginRegistry = spreadsheet.registries.pluginRegistry;
pluginRegistry.add("MyPlugin", MyPlugin);
```

## Dispatch lifecycle and methods

For processing all commands, command will go through the functions on the plugins in this order:

### `allowDispatch`

`allowDispatch(command: Command): CommandResult`

Used to refuse a command. As soon as you return anything else than `CommandResult.Success`, the
entire command processing is aborted for all plugins. This is the only way to refuse a command safely (that is, ensuring
that no plugin has updated its state and possibly perverting the `undo` stack).

```typescript
class MyPlugin extends CorePlugin {
  allowDispatch(cmd) {
    // every plugin is called for every command, only process the commands that is interesting for this plugin
    switch (cmd.type) {
      case "DO_SOMETHING":
        if (cmd.toPutInFirstProp === "bla") {
          return CommandResult.IncorrectValueForMyPlugin;
        }
    }
    return CommandResult.Success;
  }

  handle(cmd) {
    // `handle` is called only if no plugin refused the command
    switch (cmd.type) {
      case "DO_SOMETHING":
        break;
    }
  }
}

// the command result should be any number > 1000 (o-spreadsheet reserves the numbers until 1000 for internal use)
const CommandResult = {
  IncorrectValueForMyPlugin: 2000,
};
```

### `beforeHandle`

`beforeHandle(command: Command): void`

Used only in specific cases, to store temporary information before processing the command by another plugin

### `handle`

`handle(command: Command): void`

Actually processing the command. A command can be processed by multiple plugins. Handle can update the state of the
plugin and/or dispatch new commands

### `finalize`

`finalize(): void`

To continue processing a command after all plugins have handled it. In finalize, you cannot dispatch new commands

After all the `finalize` functions have been executed, the spreadsheet component will be re-rendered.

## Changes that can be undone and redone

Hitting CTRL+Z or using the Undo button should undo the last action. This action might actually have resulted in
multiple updates in multiple plugins, done by a single or multiple commands.

Changes to the state that must be restored by Undo must be done through the function `this.history.update()`

Hint: `this.history` can be used with multiple level of depth:

```typescript
class DummyPlugin extends CorePlugin {
  readonly records = {
    1: {
      data: {
        1: {
          text: "hello",
        },
      },
    },
  };

  private foo() {
    // Replace "hello" by "Bye"
    this.history.update("records", 1, "data", 1, "text", "Bye");

    // Add a new object in data
    this.history.update("records", 1, "data", 2, { text: "Here" });

    // Remove entry 1 of data
    this.history.update("records", 1, "data", undefined);
  }
}
```

## Custom external dependency

You can provide any custom dependencies to your plugin in the `Model`'s config.

Let's say you have a `user` service with the currently logged in user.
The example below shows how the service can be used in a custom plugin.

```ts
const model = new Model(data, {
  custom: {
    userService: services.user,
  },
});
class UserPlugin extends CorePlugin {
  constructor(config) {
    super(config);
    this.userService = config.custom.userService;
  }
}
```

**Delete external resources**

If your custom plugin stores data on an external server, it may be wise to delete
unused data if it is deleted from the spreadsheet.

Naively cleaning the server when the data is deleted from the spreadsheet doesn't
work well because the data is still in used in the history stack!

When the history stack is cleared (because the spreadsheet is snapshotted),
`garbageCollectExternalResources` method is called on each plugin. Implement this
method to clean unused external resources.
