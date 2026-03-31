import { inverseCommandRegistry } from "../registries/inverse_command_registry";
import { CoreCommand } from "../types/commands";

export function inverseCommand(cmd: CoreCommand): CoreCommand[] {
  return inverseCommandRegistry.get(cmd.type)(cmd);
}
