import { toXC } from "../helpers/coordinates";
import { deepEquals } from "../helpers/misc";
import { SquishedFormula, Squisher } from "../plugins/core/squisher";
import { Unsquisher } from "../plugins/core/unsquisher";
import { CoreCommand, UpdateCellCommand } from "../types/commands";
import { CoreGetters } from "../types/core_getters";
import { UpdateCellData } from "../types/misc";

/**
When squishing, commands go through 3 stages:

  STEP1 (content is a string, position is defined by row and column)

        { sheetId: "Sheet1", col: 0, row: 0, content: "1", type: "UPDATE_CELL" },
        { sheetId: "Sheet1", col: 0, row: 1, content: "2", type: "UPDATE_CELL" },
        { sheetId: "Sheet1", col: 0, row: 2, content: "3", type: "UPDATE_CELL" },

  STEP2 (content can be a string or a SquishedFormula, position is still defined by row and column)

        { sheetId: "Sheet1", col: 0, row: 0, content: "1", type: "UPDATE_CELL" },
        { sheetId: "Sheet1", col: 0, row: 1, content: { N: "+1" }, type: "UPDATE_CELL" },
        { sheetId: "Sheet1", col: 0, row: 2, content: { N: "+1" }, type: "UPDATE_CELL" },

  STEP3 (position can be defined by a range like "A1:A5")

        { sheetId: "Sheet1", col: 0, row: 0, content: "1", type: "UPDATE_CELL" },
        { sheetId: "Sheet1", targetRange: "A2:A3", content: { N: "+1" }, type: "SQUISHED_UPDATE_CELL" },
*/
interface SquishedCellData extends Omit<UpdateCellData, "content"> {
  content?: string | SquishedFormula;
}

interface UpdateCellSquishCommand extends SquishedCellData {
  type: "SQUISHED_UPDATE_CELL";
  sheetId: string;
  targetRange: string; // range like "A1:A5"
}

export type SquishedCoreCommand = UpdateCellSquishCommand;

/**
 * The CommandSquisher is responsible for squishing consecutive UPDATE_CELL commands into a single
 * SQUISHED_UPDATE_CELL command to optimize the size of messages sent over the network in collaborative mode.
 * It also unsquishes SQUISHED_UPDATE_CELL commands back into individual UPDATE_CELL commands when receiving messages from the network.
 *
 * The interface is useful to extract the dependency to the getters and be able to test the squishing and unsquishing logic in isolation.
 */
export interface ICommandSquisher {
  squish: (commands: readonly CoreCommand[]) => (CoreCommand | SquishedCoreCommand)[];

  unsquish: (
    commands: (CoreCommand | SquishedCoreCommand)[] | readonly CoreCommand[]
  ) => CoreCommand[];
}

export class CommandSquisher implements ICommandSquisher {
  public constructor(private getters: CoreGetters) {}

  /**
   * Takes a list of commands and squish them, meaning that it transforms
   * consecutive UPDATE_CELL commands with the same value or similar change to value into a single SQUISHED_UPDATE_CELL command.
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
  public squish(revisionCommands: readonly CoreCommand[]): (CoreCommand | SquishedCoreCommand)[] {
    const squishedCommands: (CoreCommand | SquishedCoreCommand)[] = [];

    for (const commands of this.collectConsecutiveUpdateCellCommands(revisionCommands)) {
      if (commands[0].type === "UPDATE_CELL" && commands.length > 1) {
        const commandsBySheet = Object.groupBy(
          commands as UpdateCellCommand[],
          (command) => command.sheetId
        );
        const sortAndSquishUpdateCells = Object.values(commandsBySheet).reduce(
          this.sortAndSquishUpdateCellsBySheet.bind(this),
          []
        );
        squishedCommands.push(...sortAndSquishUpdateCells);
      } else {
        squishedCommands.push(...commands);
      }
    }
    return squishedCommands;
  }

  /**
   * Takes a list of commands and unsquish them, meaning that it transforms
   * SQUISHED_UPDATE_CELL commands into multiple UPDATE_CELL commands.
   */
  public unsquish(
    commands: (CoreCommand | SquishedCoreCommand)[] | readonly CoreCommand[]
  ): CoreCommand[] {
    return [...new Unsquisher().unsquishCommands(commands, this.getters)];
  }

  /**
   * Create a block of consecutive UPDATE_CELL commands, meaning a block of
   * commands where all UPDATE_CELL commands are consecutive and uninterrupted by other command types.
   */
  private *collectConsecutiveUpdateCellCommands(
    commands: readonly CoreCommand[]
  ): Generator<CoreCommand[]> {
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

  private sortAndSquishUpdateCellsBySheet(
    squishedCommandsResult: (CoreCommand | SquishedCoreCommand)[],
    updateCellBlock: UpdateCellCommand[]
  ): (CoreCommand | SquishedCoreCommand)[] {
    updateCellBlock.sort((a, b) => {
      if (a.col !== b.col) {
        return a.col - b.col;
      }
      return a.row - b.row;
    });
    const hasDuplicates = updateCellBlock.some(
      (cmd, i) =>
        i > 0 && updateCellBlock[i - 1].col === cmd.col && updateCellBlock[i - 1].row === cmd.row
    );
    if (hasDuplicates) {
      squishedCommandsResult.push(...updateCellBlock);
      return squishedCommandsResult;
    }
    const squisher = new Squisher(this.getters);
    const squishedContentCommands = updateCellBlock.map((command) => ({
      ...command,
      content: squisher.squishCommand(command),
    }));

    for (let startIndex = 0; startIndex < squishedContentCommands.length; startIndex++) {
      const currentCommand = squishedContentCommands[startIndex];
      const startKey = {
        row: currentCommand.row,
        col: currentCommand.col,
      };
      let mergedRowCount = 0;

      for (
        mergedRowCount = 0;
        mergedRowCount + startIndex + 1 < squishedContentCommands.length;
        mergedRowCount++
      ) {
        const nextCommand = squishedContentCommands[mergedRowCount + startIndex + 1];
        const nextKey = {
          row: nextCommand.row,
          col: nextCommand.col,
        };
        if (
          // different column, do not merge
          nextKey.col !== startKey.col ||
          // not consecutive, do not merge
          nextKey.row !== startKey.row + mergedRowCount + 1 ||
          // different content, do not merge
          !this.compareUpdateCell(currentCommand, nextCommand)
        ) {
          break;
        }
      }

      if (mergedRowCount > 0) {
        // we have found consecutive cells with the same pattern or content, merge them
        const rangeKey = `${toXC(startKey.col, startKey.row)}:${toXC(
          startKey.col,
          startKey.row + mergedRowCount
        )}`; // example A4:A6
        const updateCellSquished: UpdateCellSquishCommand = {
          type: "SQUISHED_UPDATE_CELL",
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
        squishedCommandsResult.push(updateCellSquished);
        startIndex += mergedRowCount;
      } else {
        squishedCommandsResult.push(updateCellBlock[startIndex]);
      }
    }
    return squishedCommandsResult;
  }

  private compareUpdateCell(base: SquishedCellData, other: SquishedCellData): boolean {
    return (
      deepEquals(base.content, other.content) &&
      deepEquals(base.format, other.format) &&
      deepEquals(base.style, other.style)
    );
  }
}
