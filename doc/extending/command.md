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

For example, "RESIZE_COLUMNS_ROWS" is a CoreCommand. "AUTORESIZE_COLUMNS" can be (locally) converted into a "RESIZE_COLUMNS_ROWS", and therefore, is not a CoreCommand.
CoreCommands should be "device agnostic". This means that they should contain all the information necessary to perform their job. Local commands can use inferred information from the local internal state, such as the active sheet.

To declare a new `CoreCommands`, its type should be added to `CoreTypes`:

```js
const { coreTypes } = o_spreadsheet;

coreTypes.add("MY_COMMAND_NAME");
```

Adding the type to `CoreTypes` is necessary to identify the new command as a `CoreCommands`, and so to ensure that it will be shared.

In readonly mode, the commands are cancelled with the `CommandResult` `Readonly`. However, some commands still need to be executed. For example, the selection should still be updated.
To declare that a new command should be executed in readonly mode, its type should be added to `readonlyAllowedCommands`

```js
const { readonlyAllowedCommands } = o_spreadsheet;
readonlyAllowedCommands.add("MY_COMMAND_NAME");
```

### Repeat Commands

Some commands can be repeated. A command will be repeated if the user tries to REDO while the redo stack is empty. In this case, the history plugin will check if the last command locally dispatched is repeatable. If this is the case, the command will be adapted to the current selection and the current active sheet before being dispatched again.

#### Repeat Core Commands

To declare that a core command is repeatable, it should be added to the `repeatCommandTransformRegistry`

```js
const { repeatCommandTransformRegistry, genericRepeat } = o_spreadsheet;
repeatCommandTransformRegistry.add("MY_CORE_COMMAND", genericRepeat);
```

The second argument is a transform function that takes the original command as argument, will adapt this command to the current selection and active sheet and return the repeated command.

The `genericRepeat` function is a generic function that can be used for most commands. It will transform common command payload (sheetId/target/zone/position) to the current selection and active sheet.

If a command need a more specific transformation, a custom transform function can be defined. Here is the transform of `ADD_COL_ROW_COMMAND` for example:

```js
type RepeatTransform = (getters: Getters, cmd: CoreCommand) => CoreCommand | undefined;

export function repeatAddColumnsRowsCommand(
  getters: Getters,
  cmd: AddColumnsRowsCommand
): AddColumnsRowsCommand {
  const currentPosition = getters.getActivePosition();
  const currentSheetId = getters.getActiveSheetId();
  return {
    ...deepCopy(cmd),
    sheetId: currentSheetId,
    base: cmd.dimension === "COL" ? currentPosition.col : currentPosition.row,
  };
}
repeatCommandTransformRegistry.add("ADD_COL_ROW_COMMAND", repeatAddColumnsRowsCommand);
```

#### Repeat Local Commands

Similarly to the core commands, local commands can be repeated too. To declare that a local command is repeatable, it should be added to the `repeatLocalCommandTransformRegistry`

```js
const { repeatLocalCommandTransformRegistry, genericRepeat } = o_spreadsheet;
repeatLocalCommandTransformRegistry.add("MY_LOCAL_COMMAND", genericRepeat);
```

The difference with the core commands lies in the presence of a third argument in the transformation function: the core commands that were dispatched during the handling of the local command. This is useful if the result of the command depends on the state of an UI Plugin. In this case there's no guarantee that the state of the UI Plugin will be the same when the command is repeated. Adapting the child core commands is then sometimes a valid way to adapt the local command, as they don't depend on any internal state.

```js
type LocalRepeatTransform = (
  getters: Getters,
  cmd: LocalCommand,
  childCommands: readonly CoreCommand[]
) => CoreCommand[] | LocalCommand | undefined;
```

## Reserved keywords in commands

Some parameters in command payload are reserved, and should always have the same meaning and type each time they appear in a command. Those are :

- `sheetId` : should be a string that is an id of a valid sheet
- `col`/`row`: should be numbers describing a valid sheet position
- `zone` : should be a valid `Zone`
- `target` : should be a valid array of `Zone`
- `ranges`: should be a valid array of `RangeData`

These parameters are automatically validated for any commands by an internal `allowDispatch` test. `sheetId` must refer to an existing sheet and other parameters must describe valid positions in the sheet.
