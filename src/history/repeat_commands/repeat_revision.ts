import { Revision } from "../../collaborative/revisions";
import {
  repeatCommandTransformRegistry,
  repeatCoreCommand,
  repeatLocalCommand,
  repeatLocalCommandTransformRegistry,
} from "../../registries/repeat_commands_registry";
import { CoreCommand, Getters } from "../../types";
import { Command, isCoreCommand } from "../../types/commands";

export function canRepeatRevision(revision: Revision | undefined): boolean {
  if (!revision || !revision.rootCommands || revision.rootCommands.length > 1) {
    return false;
  }
  const rootCmd = revision.rootCommands[0];

  if (isCoreCommand(rootCmd)) {
    return repeatCommandTransformRegistry.contains(rootCmd.type);
  }

  return repeatLocalCommandTransformRegistry.contains(rootCmd.type);
}

export function repeatRevision(
  revision: Revision,
  getters: Getters
): CoreCommand[] | Command | undefined {
  if (!revision.rootCommands || revision.rootCommands.length > 1) {
    return undefined;
  }
  const rootCmd = revision.rootCommands[0];

  if (isCoreCommand(rootCmd)) {
    return repeatCoreCommand(getters, rootCmd);
  }

  return repeatLocalCommand(getters, rootCmd, revision.commands);
}
