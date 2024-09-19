import { UuidGenerator } from "@odoo/o-spreadsheet-utils";
import { deepCopy, range } from "../../helpers";
import { Getters } from "../../types";
import {
  AddColumnsRowsCommand,
  AutoresizeColumnsCommand,
  AutoresizeRowsCommand,
  CreateChartCommand,
  CreateFigureCommand,
  CreateImageOverCommand,
  CreateSheetCommand,
  DeleteCellCommand,
  GroupHeadersCommand,
  HideColumnsRowsCommand,
  InsertCellCommand,
  PasteCommand,
  RemoveColumnsRowsCommand,
  RepeatPasteCommand,
  ResizeColumnsRowsCommand,
  SortCommand,
  UnGroupHeadersCommand,
} from "./../../types/commands";
import { repeatSheetDependantCommand } from "./repeat_commands_generic";

const uuidGenerator = new UuidGenerator();

export function repeatCreateChartCommand(
  getters: Getters,
  cmd: CreateChartCommand
): CreateChartCommand {
  return {
    ...repeatSheetDependantCommand(getters, cmd),
    id: uuidGenerator.uuidv4(),
  };
}

export function repeatCreateImageCommand(
  getters: Getters,
  cmd: CreateImageOverCommand
): CreateImageOverCommand {
  return {
    ...repeatSheetDependantCommand(getters, cmd),
    figureId: uuidGenerator.uuidv4(),
  };
}

export function repeatCreateFigureCommand(
  getters: Getters,
  cmd: CreateFigureCommand
): CreateFigureCommand {
  const newCmd = repeatSheetDependantCommand(getters, cmd);
  newCmd.figure.id = uuidGenerator.uuidv4();
  return newCmd;
}

export function repeatCreateSheetCommand(
  getters: Getters,
  cmd: CreateSheetCommand
): CreateSheetCommand {
  const newCmd = deepCopy(cmd);
  newCmd.sheetId = uuidGenerator.uuidv4();

  const sheetName = cmd.name || getters.getSheet(getters.getActiveSheetId()).name;
  // Extract the prefix of the sheet name (everything before the number at the end of the name)
  const namePrefix = sheetName.match(/(.+?)\d*$/)?.[1] || sheetName;

  newCmd.name = getters.getNextSheetName(namePrefix);

  return newCmd;
}

export function repeatAddColumnsRowsCommand(
  getters: Getters,
  cmd: AddColumnsRowsCommand
): AddColumnsRowsCommand {
  const currentPosition = getters.getActivePosition();
  return {
    ...repeatSheetDependantCommand(getters, cmd),
    base: cmd.dimension === "COL" ? currentPosition.col : currentPosition.row,
  };
}

export function repeatHeaderElementCommand<
  T extends RemoveColumnsRowsCommand | HideColumnsRowsCommand | ResizeColumnsRowsCommand
>(getters: Getters, cmd: T): T {
  const currentSelection = getters.getSelectedZone();
  return {
    ...repeatSheetDependantCommand(getters, cmd),
    elements:
      cmd.dimension === "COL"
        ? range(currentSelection.left, currentSelection.right + 1)
        : range(currentSelection.top, currentSelection.bottom + 1),
  };
}

export function repeatInsertOrDeleteCellCommand<T extends InsertCellCommand | DeleteCellCommand>(
  getters: Getters,
  cmd: T
): T {
  const currentSelection = getters.getSelectedZone();
  return {
    ...deepCopy(cmd),
    zone: currentSelection,
  };
}

export function repeatAutoResizeCommand<T extends AutoresizeColumnsCommand | AutoresizeRowsCommand>(
  getters: Getters,
  cmd: T
): T {
  const newCmd = deepCopy(cmd);
  const currentSelection = getters.getSelectedZone();
  const { top, bottom, left, right } = currentSelection;
  if ("cols" in newCmd) {
    newCmd.cols = range(left, right + 1);
  } else if ("rows" in newCmd) {
    newCmd.rows = range(top, bottom + 1);
  }
  return newCmd;
}

export function repeatSortCellsCommand(getters: Getters, cmd: SortCommand): SortCommand {
  const currentSelection = getters.getSelectedZone();

  return {
    ...repeatSheetDependantCommand(getters, cmd),
    col: currentSelection.left,
    row: currentSelection.top,
    zone: currentSelection,
  };
}

export function repeatPasteCommand(getters: Getters, cmd: PasteCommand): RepeatPasteCommand {
  /**
   * Note : we have to store the state of the clipboard in the clipboard plugin, and introduce a
   * new command REPEAT_PASTE to be able to repeat the paste command.
   *
   * We cannot re-dispatch a paste, because the content of the clipboard may have changed in between.
   *
   * And we cannot adapt the sub-commands of the paste command, because they are dependant on the state of the sheet,
   * and may change based on the paste location. A simple example is that paste create new col/rows for the clipboard
   * content to fit the sheet. So there will be ADD_COL_ROW_COMMANDS in the sub-commands in the history, but repeating
   * paste might not need them. Or they could only needed for the repeated paste, not for the original.
   */
  return {
    type: "REPEAT_PASTE",
    pasteOption: deepCopy(cmd.pasteOption),
    target: getters.getSelectedZones(),
  };
}

export function repeatGroupHeadersCommand<T extends GroupHeadersCommand | UnGroupHeadersCommand>(
  getters: Getters,
  cmd: T
): T {
  const currentSelection = getters.getSelectedZone();

  return {
    ...repeatSheetDependantCommand(getters, cmd),
    start: cmd.dimension === "COL" ? currentSelection.left : currentSelection.top,
    end: cmd.dimension === "COL" ? currentSelection.right : currentSelection.bottom,
  };
}
