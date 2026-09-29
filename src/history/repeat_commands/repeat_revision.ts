import { Revision } from "../../collaborative/revisions";
import { isCoreCommand } from "../../command_registry";
import {
  repeatCommandTransformRegistry,
  repeatCoreCommand,
  repeatLocalCommand,
  repeatLocalCommandTransformRegistry,
} from "../../registries/repeat_transform_registry";
import { Command, CoreCommand } from "../../types/commands";
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
