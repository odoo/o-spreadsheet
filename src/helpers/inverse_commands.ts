import { inverseCommandRegistry } from "../registries/inverse_command_registry";
import { CoreCommand } from "../types";

export function inverseCommand(cmd: CoreCommand): CoreCommand[] {
  let fn: (cmd: CoreCommand) => CoreCommand[];
  try {
    fn = inverseCommandRegistry.get(cmd.type);
  } catch (_) {
    fn = (cmd) => [cmd];
  }
  return fn(cmd);
}
