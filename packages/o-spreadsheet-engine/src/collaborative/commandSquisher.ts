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
// TODO VSC: see if we can make this generic

// for each block of update cell or bock of anything else
// if update_cells
//    squish this block
//    push the squished command
// else
//    just push the command
export interface ICommandSquisher {
  squish: (
    allCommands: readonly (CoreCommand | SquishedCoreCommand)[]
  ) => (CoreCommand | SquishedCoreCommand)[];

  unsquish: (
    commands: (CoreCommand | SquishedCoreCommand)[] | readonly CoreCommand[]
  ) => CoreCommand[];
}

export class CommandSquisher implements ICommandSquisher {
  public constructor(private getters: CoreGetters) {}

  public unsquish(
    commands: (CoreCommand | SquishedCoreCommand)[] | readonly CoreCommand[]
  ): CoreCommand[] {
    return [...new Unsquisher().unsquishCommands(commands, this.getters)];
  }

  public squish(
    allCommands: readonly (CoreCommand | SquishedCoreCommand)[] //TODO on ne devrait pas squisher des commandes déjà squishées
  ): (CoreCommand | SquishedCoreCommand)[] {
    const squishedCommands: (CoreCommand | SquishedCoreCommand)[] = [];

    for (const commands of this.collectConsecutiveUpdateCellCommands(allCommands)) {
      if (commands[0].type === "UPDATE_CELL" && commands.length > 1) {
        // if any command here is an UPDATE_CELL, all commands are UPDATE_CELL, so we can safely cast
        const updateCellPositions: Set<string> = new Set();
        const hasDuplicateUpdateCellPositions = commands.some((command: UpdateCellCommand) => {
          const position = `${command.sheetId}!${command.col}:${command.row}`;
          if (updateCellPositions.has(position)) {
            return true;
          }
          updateCellPositions.add(position);
          return false;
        });
        if (hasDuplicateUpdateCellPositions) {
          squishedCommands.push(...commands);
        } else {
          squishedCommands.push(...this.sortAndSquishUpdateCells(commands as UpdateCellCommand[]));
        }
      } else {
        squishedCommands.push(...commands);
      }
    }
    return squishedCommands;
  }

  private *collectConsecutiveUpdateCellCommands(
    commands: readonly (CoreCommand | SquishedCoreCommand)[]
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

  private sortAndSquishUpdateCells(
    commands: UpdateCellCommand[]
  ): (CoreCommand | SquishedCoreCommand)[] {
    // { "Sheet1": [UPDATE_CELL, UPDATE_CELL],
    //   "Sheet2": [UPDATE_CELL]
    // }
    const commandsBySheet: Record<UID, UpdateCellCommand[]> = {};
    for (const command of commands) {
      commandsBySheet[command.sheetId] ??= [];
      commandsBySheet[command.sheetId].push(command);
    }

    return Object.values(commandsBySheet).reduce(this.sortAndSquishUpdateCellsBySheet, []);
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
          content: currentCommand.content,
        };
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
