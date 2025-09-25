import { groupConsecutive } from "../helpers/misc";
import {
  AddColumnsRowsCommand,
  AddMergeCommand,
  AddPivotCommand,
  CoreCommand,
  CreateChartCommand,
  CreateFigureCommand,
  CreateSheetCommand,
  CreateTableStyleCommand,
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
  coreTypes,
} from "../types/commands";
import { Registry } from "./registry";

type InverseFunction = (cmd: CoreCommand) => CoreCommand[];

export const inverseCommandRegistry = new Registry<InverseFunction>()

  .add("ADD_COLUMNS_ROWS", inverseAddColumnsRows)
  .add("REMOVE_COLUMNS_ROWS", inverseRemoveColumnsRows)
  .add("ADD_MERGE", inverseAddMerge)
  .add("REMOVE_MERGE", inverseRemoveMerge)
  .add("CREATE_SHEET", inverseCreateSheet)
  .add("DELETE_SHEET", inverseDeleteSheet)
  .add("DUPLICATE_SHEET", inverseDuplicateSheet)
  .add("CREATE_FIGURE", inverseCreateFigure)
  .add("CREATE_CHART", inverseCreateChart)
  .add("HIDE_COLUMNS_ROWS", inverseHideColumnsRows)
  .add("UNHIDE_COLUMNS_ROWS", inverseUnhideColumnsRows)
  .add("CREATE_TABLE_STYLE", inverseCreateTableStyle)
  .add("ADD_PIVOT", inverseAddPivot)
  .add("RENAME_SHEET", inverseRenameSheet)
  .add("LOCK_SHEET", inverseLockSheet)
  .add("UNLOCK_SHEET", inverseUnlockSheet);

for (const cmd of coreTypes.values()) {
  if (!inverseCommandRegistry.contains(cmd)) {
    inverseCommandRegistry.add(cmd, identity);
  }
}

function identity(cmd: CoreCommand): CoreCommand[] {
  return [cmd];
}

function inverseAddPivot(cmd: AddPivotCommand): RemovePivotCommand[] {
  return [
    {
      type: "REMOVE_PIVOT",
      pivotId: cmd.pivotId,
    },
  ];
}

function inverseAddColumnsRows(cmd: AddColumnsRowsCommand): RemoveColumnsRowsCommand[] {
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

function inverseAddMerge(cmd: AddMergeCommand): RemoveMergeCommand[] {
  return [{ type: "REMOVE_MERGE", sheetId: cmd.sheetId, target: cmd.target }];
}

function inverseRemoveMerge(cmd: RemoveMergeCommand): AddMergeCommand[] {
  return [{ type: "ADD_MERGE", sheetId: cmd.sheetId, target: cmd.target }];
}

function inverseCreateSheet(cmd: CreateSheetCommand): DeleteSheetCommand[] {
  return [{ type: "DELETE_SHEET", sheetId: cmd.sheetId, sheetName: cmd.name }];
}

function inverseDuplicateSheet(cmd: DuplicateSheetCommand): DeleteSheetCommand[] {
  return [{ type: "DELETE_SHEET", sheetId: cmd.sheetIdTo, sheetName: "" }];
}

function inverseRemoveColumnsRows(cmd: RemoveColumnsRowsCommand): AddColumnsRowsCommand[] {
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

function inverseDeleteSheet(cmd: DeleteSheetCommand): CreateSheetCommand[] {
  return [{ type: "CREATE_SHEET", sheetId: cmd.sheetId, position: 1, name: cmd.sheetName }];
}

function inverseCreateFigure(cmd: CreateFigureCommand): DeleteFigureCommand[] {
  return [{ type: "DELETE_FIGURE", figureId: cmd.figureId, sheetId: cmd.sheetId }];
}

function inverseCreateChart(cmd: CreateChartCommand): DeleteFigureCommand[] {
  return [{ type: "DELETE_FIGURE", figureId: cmd.figureId, sheetId: cmd.sheetId }];
}

function inverseHideColumnsRows(cmd: HideColumnsRowsCommand): UnhideColumnsRowsCommand[] {
  return [
    {
      type: "UNHIDE_COLUMNS_ROWS",
      sheetId: cmd.sheetId,
      dimension: cmd.dimension,
      elements: cmd.elements,
    },
  ];
}

function inverseUnhideColumnsRows(cmd: UnhideColumnsRowsCommand): HideColumnsRowsCommand[] {
  return [
    {
      type: "HIDE_COLUMNS_ROWS",
      sheetId: cmd.sheetId,
      dimension: cmd.dimension,
      elements: cmd.elements,
    },
  ];
}

function inverseCreateTableStyle(cmd: CreateTableStyleCommand): RemoveTableStyleCommand[] {
  return [{ type: "REMOVE_TABLE_STYLE", tableStyleId: cmd.tableStyleId }];
}

function inverseRenameSheet(cmd: RenameSheetCommand): RenameSheetCommand[] {
  return [
    {
      type: "RENAME_SHEET",
      sheetId: cmd.sheetId,
      oldName: cmd.newName,
      newName: cmd.oldName,
    },
  ];
}

function inverseLockSheet(cmd: LockSheetCommand): UnlockSheetCommand[] {
  return [
    {
      type: "UNLOCK_SHEET",
      sheetId: cmd.sheetId,
    },
  ];
}

function inverseUnlockSheet(cmd: UnlockSheetCommand): LockSheetCommand[] {
  return [
    {
      type: "LOCK_SHEET",
      sheetId: cmd.sheetId,
    },
  ];
}
