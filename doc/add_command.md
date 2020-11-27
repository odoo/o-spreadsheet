# Commands

Commands are the way to make changes to the state. They are dispatched to the model, which relay them to each plugins.

There are two kinds of commands: `CoreCommands` and `LocalCommands`.

1. `CoreCommands` are commands that

   - manipulate the imported/exported spreadsheet state
   - are shared in collaborative environment

1. `LocalCommands`: every other command
   - manipulate the local state
   - can be converted into CoreCommands
   - are not shared in collaborative environment

For example, "RESIZE_COLUMNS" is a CoreCommand. "AUTORESIZE_COLUMNS" can be (locally) converted into a "RESIZE_COLUMNS", and therefore, is not a CoreCommand.
CoreCommands should be "device agnostic". This means that they should contain all the information necessary to perform their job. Local commands can use inferred information from the local internal state, such as the active sheet.

To declare a new `CoreCommands`, its type should be added to `CoreTypes`:

```js
const { coreTypes } = o_spreadsheet;

coreTypes.add("MY_COMMAND_NAME");
```

Adding the type to `CoreTypes` is necessary to identify the new command as a `CoreCommands`, and so to ensure that it will be shared.
