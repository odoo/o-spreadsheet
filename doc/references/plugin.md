# Plugin

Since the spreadsheet internal state is quite complex, it is split in multiples parts (called `Plugin`), each managing a specific concern.

## Overview
Each plugin are defined as a sublass of `BasePlugin`, which defines how the plugins should interact with each other.

## References

### Properties
- **`getters`** (Getters): reference to the Getters defined on all plugins

- **`history`** (WorkborkHistory): reference to the history manager

- **`dispatch`** (Fn): reference to the dispatch method

- **`currentMode`** ([Mode](./mode.md)): mode in which the model is loaded

- **`ui`** (UIActions): reference to some utilities 

### Static Properties
- **`layers`** (LAYERS[]): Layers on which the plugin draw something

- **`getters`** (string[]): List of the getters exposed by the plugin

- **`modes`** ([Mode](./mode.md)[]): modes in which the plugin should be loaded

### Methods
- **`allowDispatch(command)`**
- **`beforeHandle(command)`**
- **`handle(command)`**
- **`finalize(command)`**
- **`drawGrid(context, layer)`**

- **`import(data)`**
- **`export()`**

### Command handling
| Method
| ------
| **[constructor]()