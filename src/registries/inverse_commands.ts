/**
 * Inverse functions for core commands. They are wired to their command in
 * `registerCommand`, in `src/command_registry.ts`.
 */
import { groupConsecutive } from "../helpers/misc";
import {
  AddColumnsRowsCommand,
  AddMergeCommand,
  AddPivotCommand,
  CreateChartCommand,
  CreateFigureCommand,
  CreateSheetCommand,
  CreateTableStyleCommand,
  DeleteChartCommand,
  DeleteFigureCommand,
  DeleteSheetCommand,
  DuplicateSheetCommand,
  HideColumnsRowsCommand,
  LockSheetCommand,
  RemoveColumnsRowsCommand,
  RemoveMergeCommand,
  RemovePivotCommand,
  RemoveTableStyleCommand,
  RenameSheetCommand,
  UnhideColumnsRowsCommand,
  UnlockSheetCommand,
} from "../types/commands";

export function inverseAddPivot(cmd: AddPivotCommand): RemovePivotCommand[] {
  return [
    {
      type: "REMOVE_PIVOT",
      pivotId: cmd.pivotId,
    },
  ];
}

export function inverseAddColumnsRows(cmd: AddColumnsRowsCommand): RemoveColumnsRowsCommand[] {
  const elements: number[] = [];
  let start = cmd.base;
  if (cmd.position === "after") {
    start++;
  }
  for (let i = 0; i < cmd.quantity; i++) {
    elements.push(i + start);
  }
  return [
    {
      type: "REMOVE_COLUMNS_ROWS",
      dimension: cmd.dimension,
      elements,
      sheetId: cmd.sheetId,
      sheetName: cmd.sheetName,
    },
  ];
}

export function inverseAddMerge(cmd: AddMergeCommand): RemoveMergeCommand[] {
  return [{ type: "REMOVE_MERGE", sheetId: cmd.sheetId, target: cmd.target }];
}

export function inverseRemoveMerge(cmd: RemoveMergeCommand): AddMergeCommand[] {
  return [{ type: "ADD_MERGE", sheetId: cmd.sheetId, target: cmd.target }];
}

export function inverseCreateSheet(cmd: CreateSheetCommand): DeleteSheetCommand[] {
  return [{ type: "DELETE_SHEET", sheetId: cmd.sheetId, sheetName: cmd.name }];
}

export function inverseDuplicateSheet(cmd: DuplicateSheetCommand): DeleteSheetCommand[] {
  return [{ type: "DELETE_SHEET", sheetId: cmd.sheetIdTo, sheetName: "" }];
}

export function inverseRemoveColumnsRows(cmd: RemoveColumnsRowsCommand): AddColumnsRowsCommand[] {
  const commands: AddColumnsRowsCommand[] = [];
  const elements = [...cmd.elements].sort((a, b) => a - b);
  for (const group of groupConsecutive(elements)) {
    const column = group[0] === 0 ? 0 : group[0] - 1;
    const position = group[0] === 0 ? "before" : "after";
    commands.push({
      type: "ADD_COLUMNS_ROWS",
      dimension: cmd.dimension,
      quantity: group.length,
      base: column,
      sheetId: cmd.sheetId,
      sheetName: cmd.sheetName,
      position,
    });
  }
  return commands;
}

export function inverseDeleteSheet(cmd: DeleteSheetCommand): CreateSheetCommand[] {
  return [{ type: "CREATE_SHEET", sheetId: cmd.sheetId, position: 1, name: cmd.sheetName }];
}

export function inverseCreateFigure(cmd: CreateFigureCommand): DeleteFigureCommand[] {
  return [{ type: "DELETE_FIGURE", figureId: cmd.figureId, sheetId: cmd.sheetId }];
}

export function inverseCreateChart(
  cmd: CreateChartCommand
): (DeleteFigureCommand | DeleteChartCommand)[] {
  return [
    { type: "DELETE_CHART", chartId: cmd.chartId, sheetId: cmd.sheetId },
    { type: "DELETE_FIGURE", figureId: cmd.figureId, sheetId: cmd.sheetId },
  ];
}

export function inverseHideColumnsRows(cmd: HideColumnsRowsCommand): UnhideColumnsRowsCommand[] {
  return [
    {
      type: "UNHIDE_COLUMNS_ROWS",
      sheetId: cmd.sheetId,
      dimension: cmd.dimension,
      elements: cmd.elements,
    },
  ];
}

export function inverseUnhideColumnsRows(cmd: UnhideColumnsRowsCommand): HideColumnsRowsCommand[] {
  return [
    {
      type: "HIDE_COLUMNS_ROWS",
      sheetId: cmd.sheetId,
      dimension: cmd.dimension,
      elements: cmd.elements,
    },
  ];
}

export function inverseCreateTableStyle(cmd: CreateTableStyleCommand): RemoveTableStyleCommand[] {
  return [{ type: "REMOVE_TABLE_STYLE", tableStyleId: cmd.tableStyleId }];
}

export function inverseRenameSheet(cmd: RenameSheetCommand): RenameSheetCommand[] {
  return [
    {
      type: "RENAME_SHEET",
      sheetId: cmd.sheetId,
      oldName: cmd.newName,
      newName: cmd.oldName,
    },
  ];
}

export function inverseLockSheet(cmd: LockSheetCommand): UnlockSheetCommand[] {
  return [
    {
      type: "UNLOCK_SHEET",
      sheetId: cmd.sheetId,
    },
  ];
}

export function inverseUnlockSheet(cmd: UnlockSheetCommand): LockSheetCommand[] {
  return [
    {
      type: "LOCK_SHEET",
      sheetId: cmd.sheetId,
    },
  ];
}
