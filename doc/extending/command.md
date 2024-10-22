# Commands

Commands are essential for modifying the spreadsheet state. They are dispatched to the model, which in turn relays them to each plugin.
There are two types of commands: `CoreCommand` and `LocalCommand`.

## Types of Commands

### CoreCommand

- **Purpose**: Low-level commands for updating the core spreadsheet state.
- **Handling**: Managed by core plugins to modify their state.
- **Sub-Commands**: Can dispatch sub-core commands but not sub-local commands.
- **Collaboration**: Broadcast to other connected users in a collaborative environment.

### LocalCommand

- **Purpose**: Higher-level commands for managing the UI state or dispatching low level core commands.
- **Handling**: Managed by UI plugins. They cannot be handled by core plugins
- **Sub-Commands**: Can dispatch sub-commands, which can be either core or local commands.
- **Collaboration**: Not broadcast to other connected users (but sub-core commands are).

### Example

- `RESIZE_COLUMNS_ROWS`: A `CoreCommand` handled by a core plugin to adjust the size of rows or columns.
- `AUTORESIZE_COLUMNS`: A `LocalCommand` handled by a UI plugin, which dispatches the sub-command `RESIZE_COLUMNS_ROWS` based on the current cell content.

### Device Agnosticism

Core commands should be device-agnostic and include all necessary information to perform their function. Local commands can use inferred information from the local internal state, such as the active sheet.

## Declaring New Commands

### CoreCommands

To declare a new `CoreCommands`, its type should be added to `coreTypes`:

```ts
import { coreTypes } from "@odoo/o-spreadsheet";

coreTypes.add("MY_COMMAND_NAME");
```

### Read-Only Mode

In read-only mode, all core commands are cancelled with the `CommandResult` `Readonly` since the spreadsheet state cannot be modified.
However, some locale commands still need to be executed, such as updating the active sheet.
To allow a new local command in read-only mode, add its type to `readonlyAllowedCommands`:

```ts
import { readonlyAllowedCommands } from "@odoo/o-spreadsheet";

readonlyAllowedCommands.add("MY_COMMAND_NAME");
```

## Reserved keywords in commands

Certain parameters in command payloads are reserved and should consistently maintain the same meaning and type:

- `sheetId`: a string representing a valid sheet ID.
- `col`/`row`: numbers representing a valid sheet position.
- `zone` : a valid Zone.
- `target` : an array of Zone.
- `ranges`: an array of RangeData.

These parameters are automatically validated by an internal `allowDispatch` test, ensuring `sheetId` refers to an existing sheet and other parameters describe valid positions within the sheet. If one of those parameters isn't valid, the command is rejected.

## Repeat Commands

Some commands can be repeated with CTRL+Y (redo) when the redo stack is empty. The history plugin checks if the last locally dispatched command is repeatable. If so, the command is adapted to the current selection and active sheet before being dispatched again.

### Repeat Core Commands

To declare a repeatable core command, add it to the `repeatCommandTransformRegistry`

```ts
import { repeatCommandTransformRegistry, genericRepeat } from "@odoo/o-spreadsheet";

repeatCommandTransformRegistry.add("MY_CORE_COMMAND", genericRepeat);
```

The second argument is a transformation function that takes the original command, adapts it to the current selection and active sheet, and returns the repeated command.
The `genericRepeat` function is a generic transformation that works for most commands, transforming common command payloads (e.g., sheetId, target, zone, position) to the current selection and active sheet.

For commands requiring specific transformations, a custom function can be defined. For example, the transformation for `ADD_COL_ROW_COMMAND`:

```ts
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

### Repeat Local Commands

Local commands can also be repeated. To declare a repeatable local command, add it to the `repeatLocalCommandTransformRegistry`:

```ts
import { repeatLocalCommandTransformRegistry, genericRepeat } from "@odoo/o-spreadsheet";

repeatLocalCommandTransformRegistry.add("MY_LOCAL_COMMAND", genericRepeat);
```

For local commands, the transformation function includes a third argument: the core (sub)commands dispatched during the handling of the root local command. This is useful if the result depends on the UI plugins' state, as there is no guarantee that the UI plugins' state will be the same when the command is repeated. Adapting the child core commands can be a valid way to adjust the local command, as they do not depend on any internal state.

```ts
type LocalRepeatTransform = (
  getters: Getters,
  cmd: LocalCommand,
  childCommands: readonly CoreCommand[]
) => CoreCommand[] | LocalCommand | undefined;
```
