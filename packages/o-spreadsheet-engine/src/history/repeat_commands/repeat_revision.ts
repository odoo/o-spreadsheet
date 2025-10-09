import {
  repeatCommandTransformRegistry,
  repeatCoreCommand,
  repeatLocalCommand,
  repeatLocalCommandTransformRegistry,
} from "../../../../../src/registries/repeat_commands_registry";
import { Revision } from "../../collaborative/revisions";
import { Command, CoreCommand, isCoreCommand } from "../../types/commands";
import { Getters } from "../../types/getters";

export function canRepeatRevision(revision: Revision | undefined): boolean {
  if (!revision || !revision.rootCommand || typeof revision.rootCommand !== "object") {
    return false;
  }

  if (isCoreCommand(revision.rootCommand)) {
    return repeatCommandTransformRegistry.contains(revision.rootCommand.type);
  }

  return repeatLocalCommandTransformRegistry.contains(revision.rootCommand.type);
}

export function repeatRevision(
  revision: Revision,
  getters: Getters
): CoreCommand[] | Command | undefined {
  if (!revision.rootCommand || typeof revision.rootCommand !== "object") {
    return undefined;
  }

  if (isCoreCommand(revision.rootCommand)) {
    return repeatCoreCommand(getters, revision.rootCommand);
  }

  return repeatLocalCommand(getters, revision.rootCommand, revision.commands);
}
