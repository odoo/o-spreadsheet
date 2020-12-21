import { Registry } from "../registry";
import {
  AddColumnsCommand,
  AddMergeCommand,
  AddRowsCommand,
  CoreCommand,
  CreateSheetCommand,
  DeleteSheetCommand,
  DuplicateSheetCommand,
  RemoveColumnsCommand,
  RemoveMergeCommand,
  RemoveRowsCommand,
} from "../types";

type InverseFunction = (cmd: CoreCommand) => CoreCommand[];

export const inverseCommandsRegistry = new Registry<InverseFunction>()
  .add("UPDATE_CELL", identity)
  .add("UPDATE_CELL_POSITION", identity)
  .add("CLEAR_CELL", identity)
  .add("DELETE_CONTENT", identity)
  .add("ADD_COLUMNS", inverseAddColumns)
  .add("ADD_ROWS", inverseAddRows)
  // .add("REMOVE_COLUMNS", todo)
  // .add("REMOVE_ROWS", todo)
  .add("RESIZE_COLUMNS", identity)
  .add("RESIZE_ROWS", identity)
  .add("ADD_MERGE", inverseAddMerge)
  .add("REMOVE_MERGE", inverseRemoveMerge)
  .add("CREATE_SHEET", inverseCreateSheet)
  // .add("DELETE_SHEET", todo)
  .add("DUPLICATE_SHEET", inverseDuplicateSheet)
  .add("MOVE_SHEET", identity)
  .add("RENAME_SHEET", identity)
  // .add("ADD_CONDITIONAL_FORMAT", todo)
  // .add("REMOVE_CONDITIONAL_FORMAT", todo)
  // .add("CREATE_FIGURE", todo)
  // .add("DELETE_FIGURE", todo)
  .add("UPDATE_FIGURE", identity)
  .add("SET_FORMATTING", identity)
  .add("CLEAR_FORMATTING", identity)
  .add("SET_BORDER", identity)
  .add("SET_DECIMAL", identity)
  // .add("CREATE_CHART", todo)
  .add("UPDATE_CHART", identity);

function identity(cmd: CoreCommand): CoreCommand[] {
  return [cmd];
}

export function inverseCommand(cmd: CoreCommand): CoreCommand[] {
  return inverseCommandsRegistry.get(cmd.type)(cmd);
}

function inverseAddColumns(cmd: AddColumnsCommand): RemoveColumnsCommand[] {
  const columns: number[] = [];
  let start = cmd.column;
  if (cmd.position === "after") {
    start++;
  }
  for (let i = 0; i < cmd.quantity; i++) {
    columns.push(i + start);
  }
  return [{
    type: "REMOVE_COLUMNS",
    columns,
    sheetId: cmd.sheetId,
  }];
}

function inverseAddRows(cmd: AddRowsCommand): RemoveRowsCommand[] {
  const rows: number[] = [];
  let start = cmd.row;
  if (cmd.position === "after") {
    start++;
  }
  for (let i = 0; i < cmd.quantity; i++) {
    rows.push(i + start);
  }
  return [{
    type: "REMOVE_ROWS",
    rows,
    sheetId: cmd.sheetId,
  }];
}

function inverseAddMerge(cmd: AddMergeCommand): RemoveMergeCommand[] {
  return [{ type: "REMOVE_MERGE", sheetId: cmd.sheetId, zone: cmd.zone }];
}

function inverseRemoveMerge(cmd: RemoveMergeCommand): AddMergeCommand[] {
  return [{ type: "ADD_MERGE", sheetId: cmd.sheetId, zone: cmd.zone }];
}

function inverseCreateSheet(cmd: CreateSheetCommand): DeleteSheetCommand[] {
  return [{ type: "DELETE_SHEET", sheetId: cmd.sheetId }];
}

function inverseDuplicateSheet(cmd: DuplicateSheetCommand): DeleteSheetCommand[] {
  return [{ type: "DELETE_SHEET", sheetId: cmd.sheetIdTo }];
}

// function inverseCreateFigure(cmd: CreateFigureCommand):DeleteFigureCommand{
//   //TODO ID
//   return{type:"DELETE_FIGURE",id:cmd.}
// }

// function inverseDeleteSheet(cmd:DeleteSheetCommand):CreateSheetCommand{
//   //TODO Position ?
//   return{type:"CREATE_SHEET",sheetId:cmd.sheetId}
// }

// function inverseRemoveColumns(cmd: RemoveColumnsCommand): AddColumnsCommand {

// }
