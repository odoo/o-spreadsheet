import { isDefined } from "../../helpers/index";
import { otRegistry } from "../../registries/ot_registry";
import { CoreCommand } from "../../types";
import { tryTransform } from "../../types/collaborative/ot_types";
import "./ot_elements_added";
import "./ot_elements_removed";
import "./ot_figure_deleted";
import "./ot_sheet_deleted";

/**
 * Get the result of applying the operation transformations on the given command
 * to transform based on the executed command.
 * Let's see a small example:
 * Given
 *  - command A: set the content of C1 to "Hello"
 *  - command B: add a column after A
 *
 * If command B has been executed locally and not transmitted (yet) to
 * other clients, and command A arrives from an other client to be executed locally.
 * Command A is no longer valid and no longer reflects the user intention.
 * It needs to be transformed knowing that command B is already executed.
 * transform(A, B) => set the content of D1 to "Hello"
 */
export function transform(
  toTransform: CoreCommand,
  executed: CoreCommand
): CoreCommand | undefined {
  const tryT = tryTransform(toTransform, executed);
  if (tryT !== null) {
    return tryT;
  }
  const ot = otRegistry.getTransformation(toTransform.type, executed.type);
  return ot ? ot(toTransform, executed) : toTransform;
}

/**
 * Get the result of applying the operation transformations on all the given
 * commands to transform for each executed commands.
 */
export function transformAll(
  toTransform: readonly CoreCommand[],
  executed: readonly CoreCommand[]
): CoreCommand[] {
  let transformedCommands = [...toTransform];
  for (const executedCommand of executed) {
    transformedCommands = transformedCommands
      .map((cmd) => transform(cmd, executedCommand))
      .filter(isDefined);
  }
  return transformedCommands;
}
