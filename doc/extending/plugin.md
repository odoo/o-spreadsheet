- [Plugins](#plugins)
  - [Plugin skeleton](#plugin-skeleton)
  - [Core plugin dependencies](#core-plugin-dependencies)
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

Plugins are divided into three base classes: `CorePlugin`, `EvaluationPlugin` and `UIPlugin`. Each base class is tied to a registry in `src/plugins/plugin_registries.ts`, and these registries refuse a plugin that does not extend the expected base class:

| Base class         | Registry                   | Folder                     | Getters it receives                     |
| ------------------ | -------------------------- | -------------------------- | --------------------------------------- |
| `CorePlugin`       | `corePluginRegistry`       | `src/plugins/core/`        | `CoreGetters`                           |
| `EvaluationPlugin` | `evaluationPluginRegistry` | `src/plugins/evaluation/`  | `EvaluationGetters` (core + evaluation) |
| `UIPlugin`         | `statefulUIPluginRegistry` | `src/plugins/ui_stateful/` | `Getters` (everything)                  |
| `UIPlugin`         | `featurePluginRegistry`    | `src/plugins/ui_feature/`  | `Getters` (everything)                  |

### I. CorePlugin

- manages data that is persistent
- can make changes to its state using the history interface (allowing `undo` and `redo`)
- import and export its state to be stored in the o-spreadsheet file
- can only dispatch core commands
- must declare the core plugins it depends on in a `static dependencies` list, and can only read the getters of those plugins (see [Core plugin dependencies](#core-plugin-dependencies))

### II. EvaluationPlugin

- has a state mainly derived from core data (cell evaluation, computed styles, chart runtime, ...)
- never persisted, never transmitted to other collaborators: every client recomputes it from the same replayed core commands
- cannot change the model data: it can only dispatch _evaluation_ commands (see [Commands](./command.md))
- only handles `EvaluationCommand`: core commands, `UNDO`/`REDO`, evaluation commands and a short list of local commands impacting derived state. UI commands never reach it (see [Commands](./command.md))

### III. UIPlugin

- manages transient state, user specific state and everything that is needed to display the spreadsheet without changing the persistent data

UI plugins include:

1. Stateful Plugins: have a state, but which should not be shared in collaborative
2. Feature Plugins: handle a specific feature, without handling any core commands

Unsure which of the four plugin categories (or which store) your feature belongs in? See [Where should this code live?](./where_to_put_code.md).

## Plugin skeleton

```typescript
const { CorePlugin } = o_spreadsheet;
const { SheetPlugin } = o_spreadsheet.corePlugins;

// The first type parameter is the plugin class itself: it lets TypeScript compute
// the type of `this.getters` from `MyPlugin.dependencies` (see below).
class MyPlugin extends CorePlugin<typeof MyPlugin> {
  // Mandatory: the core plugins whose getters this plugin reads. `[]` if none.
  static readonly dependencies = [SheetPlugin] as const;
  // makes getSomething accessible from anywhere that has a reference to model.getters
  static getters = ["getSomething"] as const;

  readonly myPluginState = { firstProp: "hello" };

  // ---------------------------------------------------------------------
  // Command handling
  // ---------------------------------------------------------------------

  // only the commands listed here reach this plugin
  handlers = {
    DO_SOMETHING: this.onDoSomething,
  };

  private onDoSomething(cmd) {
    if (this.getters.tryGetSheet(cmd.sheetId)) {
      this.history.update("myPluginState", "firstProp", cmd.toPutInFirstProp);
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

// add the new "MyPlugin" to the registry matching its base class
// (corePluginRegistry, evaluationPluginRegistry, statefulUIPluginRegistry or featurePluginRegistry).
// It will be automatically instantiated by o-spreadsheet when you mount the spreadsheet component or when you create a new Model()
const { corePluginRegistry } = o_spreadsheet.registries;
corePluginRegistry.add("MyPlugin", MyPlugin);
```

## Core plugin dependencies

Every class extending `CorePlugin` must declare a `static dependencies` property listing the core plugins it reads from. A plugin that reads nothing from other plugins declares an empty list:

```typescript
class MergePlugin extends CorePlugin<typeof MergePlugin, MergeState> {
  static readonly dependencies = [CellPlugin, HeaderVisibilityPlugin] as const;
  ...
}

class SheetPlugin extends CorePlugin<typeof SheetPlugin, SheetState> {
  static readonly dependencies = [] as const;
  ...
}
```

### What it brings

**1. `this.getters` only contains what you depend on.**
A core plugin no longer receives every `CoreGetters`. At instantiation, the model gives it a getters object made of:

- the getters of `RangeAdapterPlugin` and `FormulaProviderAggregator` (always available),
- the getters of each plugin listed in `dependencies`, and, through them, the getters of their own dependencies (the closure is transitive),
- its own getters.

**note:** The restriction is enforced in typescript.

### Registration order

Plugins are instantiated (and imported) in the order of `corePluginRegistry`, and the getters of a dependency are collected when the dependent plugin is instantiated. A dependency must therefore be **registered before** the plugins that depend on it. The registry does not reorder plugins: if a dependency is registered later, or not registered at all, its getters are silently missing from `this.getters`.

### What to put in `dependencies`

List the plugins whose getters you call directly, not their own dependencies: those are included transitively. For example, `MergePlugin` depends on `CellPlugin`, which depends on `SheetPlugin`, so `MergePlugin` can call sheet getters without listing `SheetPlugin`. Listing it anyway is harmless and documents a direct use.

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
