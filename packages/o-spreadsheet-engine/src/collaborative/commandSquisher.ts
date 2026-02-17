import { toXC } from "../helpers/coordinates";
import { deepEquals } from "../helpers/misc";
import { Squisher } from "../plugins/core/squisher";
import { Unsquisher } from "../plugins/core/unsquisher";
import {
  SquishedCoreCommand,
  UpdateCellSquishCommand,
  UpdateCellSquishMultiCommand,
} from "../types/collaborative/transport_service";
import { CoreCommand, UpdateCellCommand } from "../types/commands";
import { CoreGetters } from "../types/core_getters";
import { UID } from "../types/misc";

/**
 * The CommandSquisher is responsible for squishing consecutive UPDATE_CELL commands into a single
 * UPDATE_CELL_SQUISH command to optimize the size of messages sent over the network in collaborative mode.
 * It also unsquishes UPDATE_CELL_SQUISH commands back into individual UPDATE_CELL commands when receiving messages from the network.
 *
 * The interface is usefull to extract the dependency to the getters and be able to test the squishing and unsquishing logic in isolation.
 */
export interface ICommandSquisher {
  squish: (
    allCommands: (CoreCommand | SquishedCoreCommand)[] | readonly CoreCommand[]
  ) => (CoreCommand | SquishedCoreCommand)[];

  unsquish: (
    commands: (CoreCommand | SquishedCoreCommand)[] | readonly CoreCommand[]
  ) => CoreCommand[];
}

export class CommandSquisher implements ICommandSquisher {
  public constructor(private getters: CoreGetters) {}

  /**
   * Takes a list of commands and unsquish them, meaning that it transforms
   * UPDATE_CELL_SQUISH commands into multiple UPDATE_CELL commands.
   */
  public unsquish(
    commands: (CoreCommand | SquishedCoreCommand)[] | readonly CoreCommand[]
  ): CoreCommand[] {
    return [...new Unsquisher().unsquishCommands(commands, this.getters)];
  }

  /**
   * Takes a list of commands and squish them, meaning that it transforms
   * consecutive UPDATE_CELL commands with the same value or similar change to value into a single UPDATE_CELL_SQUISH command.
   * The logic to find similar value is the same as the one used in the export of the cells, in squisher.ts.
   *
   * We do not squish UPDATE_CELL commands if there are duplicates (same cell updated multiple times),
   * and we stop squishing if a series of consecutive UPDATE_CELL commands is interrupted by another command type.
   *
   * We reorder the command within the same consecutive UPDATE_CELL uninterrupted block by sheet,
   * to maximize the chances to squish commands together, but we do not reorder commands
   * from different sheets or blocks, to avoid creating conflicts with commands that are not commutative.
   *
   * @param revisionCommands all the commands of a given revision
   * @returns all the commands of the revision, with consecutive UPDATE_CELL commands squished together when possible
   */
  public squish(
    revisionCommands: (CoreCommand | SquishedCoreCommand)[] | readonly CoreCommand[]
  ): (CoreCommand | SquishedCoreCommand)[] {
    const squishedCommands: (CoreCommand | SquishedCoreCommand)[] = [];

    for (const commands of this.collectConsecutiveUpdateCellCommands(revisionCommands)) {
      if (commands[0].type === "UPDATE_CELL" && commands.length > 1) {
        squishedCommands.push(...this.sortAndSquishUpdateCells(commands as UpdateCellCommand[]));
      } else {
        squishedCommands.push(...commands);
      }
    }
    return squishedCommands;
  }

  /**
   * Create a block of consecutive UPDATE_CELL commands, meaning a block of
   * commands where all UPDATE_CELL commands are consecutive and uninterrupted by other command types.
   */
  private *collectConsecutiveUpdateCellCommands(
    commands: (CoreCommand | SquishedCoreCommand)[] | readonly CoreCommand[]
  ): Generator<(CoreCommand | SquishedCoreCommand)[]> {
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.type === "UPDATE_CELL") {
        const updateCellCommands: UpdateCellCommand[] = [command];
        for (let j = i + 1; j < commands.length; j++) {
          const nextCommand = commands[j];
          if (nextCommand.type === "UPDATE_CELL") {
            updateCellCommands.push(nextCommand);
          } else {
            break;
          }
        }
        yield updateCellCommands;
        i += updateCellCommands.length - 1;
      } else {
        yield [command];
      }
    }
  }

  /**
   * Takes a block of UPDATE_CELL commands of the same sheet and try to squish them together.
   */
  private sortAndSquishUpdateCells(
    commands: UpdateCellCommand[]
  ): (CoreCommand | SquishedCoreCommand)[] {
    const commandsBySheet: Record<UID, UpdateCellCommand[]> = {};
    for (const command of commands) {
      commandsBySheet[command.sheetId] ??= [];
      commandsBySheet[command.sheetId].push(command);
    }

    return Object.values(commandsBySheet).reduce(
      this.sortAndSquishUpdateCellsBySheet.bind(this),
      []
    );
  }

  private sortAndSquishUpdateCellsBySheet(
    allUpdateCellCommands: (CoreCommand | SquishedCoreCommand)[],
    commands: UpdateCellCommand[]
  ): (CoreCommand | SquishedCoreCommand)[] {
    commands.sort((a, b) => {
      if (a.col !== b.col) {
        return a.col - b.col;
      }
      return a.row - b.row;
    });
    const hasDuplicates = commands.some(
      (cmd, i) => i > 0 && commands[i - 1].col === cmd.col && commands[i - 1].row === cmd.row
    );
    if (hasDuplicates) {
      allUpdateCellCommands.push(...commands);
      return allUpdateCellCommands;
    }
    const s = new Squisher(this.getters);
    const squishedCommands: SquishedCoreCommand[] = commands.map((command) => ({
      ...command,
      content: s.squishContent(command),
      type: "UPDATE_CELL_SQUISH",
    }));

    for (let startIndex = 0; startIndex < squishedCommands.length; startIndex++) {
      const currentCommand = squishedCommands[startIndex] as UpdateCellSquishCommand;
      const startKey = {
        row: currentCommand.row,
        col: currentCommand.col,
      };
      let offset = 0;

      for (offset = 0; offset + startIndex + 1 < squishedCommands.length; offset++) {
        const nextCommand = squishedCommands[offset + startIndex + 1] as UpdateCellSquishCommand;
        const nextKey = {
          row: nextCommand.row,
          col: nextCommand.col,
        };
        if (
          // different column, do not merge
          nextKey.col !== startKey.col ||
          // not consecutive, do not merge
          nextKey.row !== startKey.row + offset + 1 ||
          // different content, do not merge
          !this.compareUpdateCell(currentCommand, nextCommand)
        ) {
          break;
        }
      }

      if (offset > 0) {
        // we have found consecutive cells with the same pattern or content, merge them
        const rangeKey = `${toXC(startKey.col, startKey.row)}:${toXC(
          startKey.col,
          startKey.row + offset
        )}`; // par ex A4:A6
        const updateCellSquished: UpdateCellSquishMultiCommand = {
          type: "UPDATE_CELL_SQUISH",
          sheetId: currentCommand.sheetId,
          targetRange: rangeKey,
        };
        if ("content" in currentCommand) {
          updateCellSquished.content = currentCommand.content;
        }
        if ("format" in currentCommand) {
          updateCellSquished.format = currentCommand.format;
        }
        if ("style" in currentCommand) {
          updateCellSquished.style = currentCommand.style;
        }
        allUpdateCellCommands.push(updateCellSquished);
        startIndex += offset;
      } else {
        allUpdateCellCommands.push(commands[startIndex]);
      }
    }
    return allUpdateCellCommands;
  }

  private compareUpdateCell(base: SquishedCoreCommand, other: SquishedCoreCommand): boolean {
    return (
      deepEquals(base.content, other.content) &&
      deepEquals(base.format, other.format) &&
      deepEquals(base.style, other.style)
    );
  }
}
