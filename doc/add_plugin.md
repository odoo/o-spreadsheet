# Plugins

A plugin is a way for o-spreadsheet to organize features in order not to interfere with one another.

All plugins can :

- have its own state
- new getters to make parts of its state available for other plugins, for the user interface or to use in formula
  functions
- react to any existing command

There is 2 different kind of plugins: CorePlugin and UIPlugin.

- CorePlugin
  - manages data that is persistent
  - can make changes to its state using the history interface (allowing `undo` and `redo`)
  - import and export its state to be stored in the o-spreadsheet file
- UIPlugin manages transient state, user specific state and everything that is needed to display the spreadsheet without changing the persistent data (like evaluation)

## Plugin skeleton

```javascript
/*
class MyPlugin extends spreadsheet.BasePlugin { // V1.0
  constructor(workbook, getters, history, dispatch, config) { // V1.0
 */

class MyPlugin extends spreadsheet.CorePlugin {
  constructor(getters, history, dispatch, config) {
    // will assign the correctly the references of the parameters
    super(...arguments);

    // create plugin state here
    this.myPluginState = { firstProp: "hello" };

    // assign default values
    this.currentSomething = "";
  }

  // ---------------------------------------------------------------------
  // Command handling
  // ---------------------------------------------------------------------
  allowDispatch(cmd) {
    // every plugin are called for every command, only process the commands that is interesting for this plugin
    switch (cmd.type) {
      case "DO_SOMETHING":
        if (cmd.toPutInFirstProp === "bla") {
          return CommandResult.IncorrectValueForMyPlugin;
        }
    }
    return CommandResult.Success;
  }

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

// makes the new plugin to be instantiated for every spreadsheet mode
MyPlugin.modes = ["normal", "headless", "readonly"];

// makes the function getSomething accessible from anywhere that has a reference to model.getters
MyPlugin.getters = ["getSomething"];

// add the new "MyPlugin" to the plugin registry.
// It will be automatically instantiated by o-spreadsheet when you mount the spreadsheet component or when you create a new Model()
const pluginRegistry = spreadsheet.registries.pluginRegistry;
pluginRegistry.add("MyPlugin", MyPlugin);

// the command result should be any number > 1000 (o-spreadsheet reserves the numbers until 1000 for internal use)
const CommandResult = {
  IncorrectValueForMyPlugin: 2000,
};
```

## Dispatch lifecycle and methods

For processing all commands, command will go through the functions on the plugins in this order:

1. `allowDispatch(command: Command): CommandResult`
   Used to refuse a command and return a message. As soon as you return anything else than CommandResult.Success, the
   entire command processing stops for all plugins Here is the only way to refuse a command safely (that is, ensuring
   that no plugin has updated its state and possibly perverting the `undo` stack).

2. `beforeHandle(command: Command): void`
   Used only in specific cases, to store temporary information before processing the command by another plugin

3. `handle(command: Command): void`
   Actually processing the command. A command can be processed by multiple plugins. Handle can update the state of the
   plugin and/or dispatch new commands

4. `finalize(command: Command): void`
   To continue processing a command after all plugins have handled it. In finalize, you cannot dispatch new commands

After all the `finalize` functions have been executed, the OWL state of spreadsheet will be updated.

## Specifics for interactive commands

If a command has the flag `{ interactive: true }`, the command will not call `allowDispatch` nor `finalize`

## Changes that can be undone and redone

The OWL state that is used to display the state of the spreadsheet to the user should be mainly based on the result of
some getters that are implemented in the plugins. The getter will return part of the state that is controlled by the
plugin bound to part of the interface.

Hitting CTRL+Z or using the Undo button should undo the last action. This action might actually have resulted in
multiple updates in multiple plugins, done by a single or multiple commands.

Changes to the state that must be restored by Undo must be done through the function `this.history.update()`

TODO: explain about object reference must be different and array changes

### Undo-able change example

```javascript
class MyPlugin extends spreadsheet.CorePlugin {
  constructor(workbook, getters, history, dispatch, config) {
    super(...arguments);
    this.myPluginState = {
      firstProp: "bla",
      secondProp: "hello",
    };
  }

  handle(cmd) {
    switch (cmd.type) {
      case "MyPluginCommand":
        // set this.myPluginState.firstProp to cmd.newValue in a way that can be undone
        this.history.update("myPluginState", "firstPrp", cmd.newValue)
        // after the command is completely processed, the user can hit Undo, the value will be reset to its previous value
        break;
    }
  }
}

...
```
