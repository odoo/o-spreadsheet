import { CoreCommand, LocalCommand } from "../types/commands";
import { Getters } from "../types/getters";
import { Registry } from "./registry";

type RepeatTransform = (getters: Getters, cmd: CoreCommand) => CoreCommand | undefined;
type LocalRepeatTransform = (
  getters: Getters,
  cmd: LocalCommand,
  childCommands: readonly CoreCommand[]
) => CoreCommand[] | LocalCommand | undefined;
/**
 *  Registry containing all the command that can be repeated on redo, and function to transform them
 *  to the current state of the model.
 *
 * If the transform function is undefined, the command will be transformed using generic transformations.
 * (change the sheetId, the row, the col, the target, the ranges, to the current active sheet & selection)
 *
 */
export const repeatCommandTransformRegistry = new Registry<RepeatTransform>();
export const repeatLocalCommandTransformRegistry = new Registry<LocalRepeatTransform>();

export function repeatCoreCommand(
  getters: Getters,
  command: CoreCommand | undefined
): CoreCommand | undefined {
  if (!command) {
    return undefined;
  }

  const isRepeatable = repeatCommandTransformRegistry.contains(command.type);
  if (!isRepeatable) {
    return undefined;
  }

  const transform = repeatCommandTransformRegistry.get(command.type);
  return transform(getters, command);
}

export function repeatLocalCommand(
  getters: Getters,
  command: LocalCommand,
  childCommands: readonly CoreCommand[]
): CoreCommand[] | LocalCommand | undefined {
  const isRepeatable = repeatLocalCommandTransformRegistry.contains(command.type);
  if (!isRepeatable) {
    return undefined;
  }

  const repeatTransform = repeatLocalCommandTransformRegistry.get(command.type);
  return repeatTransform(getters, command, childCommands);
}
