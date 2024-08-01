import { inverseCommandRegistry } from "../registries/inverse_command_registry";
import type { CoreCommand } from "../types";

export function inverseCommand(cmd: CoreCommand): CoreCommand[] {
  return inverseCommandRegistry.get(cmd.type)(cmd);
}
