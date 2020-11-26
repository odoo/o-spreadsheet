import {
  AddColumnsCommand,
  AddMergeCommand,
  AddRowsCommand,
  CoreCommand,
  CoreCommandTypes,
  CreateSheetCommand,
  DeleteSheetCommand,
  DuplicateSheetCommand,
  RemoveColumnsCommand,
  RemoveMergeCommand,
  RemoveRowsCommand,
} from "../types";

type InverseMap = Record<CoreCommandTypes, (cmd: CoreCommand) => CoreCommand>;

const map: InverseMap = {
  /** CELLS */
  UPDATE_CELL: identity,
  UPDATE_CELL_POSITION: identity,
  CLEAR_CELL: identity,
  DELETE_CONTENT: identity,

  /** GRID SHAPE */
  ADD_COLUMNS: inverseAddColumns,
  ADD_ROWS: inverseAddRows,
  REMOVE_COLUMNS: todo,
  REMOVE_ROWS: todo,
  RESIZE_COLUMNS: identity,
  RESIZE_ROWS: identity,

  /** MERGE */
  ADD_MERGE: inverseAddMerge,
  REMOVE_MERGE: inverseRemoveMerge,

  /** SHEETS MANIPULATION */
  CREATE_SHEET: inverseCreateSheet,
  DELETE_SHEET: todo,
  DUPLICATE_SHEET: inverseDuplicateSheet,
  MOVE_SHEET: todo,
  RENAME_SHEET: todo,

  /** CONDITIONAL FORMAT */
  ADD_CONDITIONAL_FORMAT: todo,
  REMOVE_CONDITIONAL_FORMAT: todo,

  /** FIGURES */
  CREATE_FIGURE: todo,
  DELETE_FIGURE: todo,
  UPDATE_FIGURE: identity,

  /** FORMATTING */
  SET_FORMATTING: identity,
  CLEAR_FORMATTING: identity,
  SET_BORDER: identity,
  SET_DECIMAL: identity,

  /** CHART */
  CREATE_CHART: todo,
  UPDATE_CHART: identity,
};

function identity(cmd: CoreCommand): CoreCommand {
  return cmd;
}

function todo(cmd: CoreCommand): CoreCommand {
  // console.warn(`Not implemented: ${cmd.type}`);
  return identity(cmd);
}

export function inverseCommand(cmd: CoreCommand): CoreCommand {
  return map[cmd.type](cmd);
}

function inverseAddColumns(cmd: AddColumnsCommand): RemoveColumnsCommand {
  const columns: number[] = [];
  let start = cmd.column;
  if (cmd.position === "after") {
    start++;
  }
  for (let i = 0; i < cmd.quantity; i++) {
    columns.push(i + start);
  }
  return {
    type: "REMOVE_COLUMNS",
    columns,
    sheetId: cmd.sheetId,
  };
}

function inverseAddRows(cmd: AddRowsCommand): RemoveRowsCommand {
  const rows: number[] = [];
  let start = cmd.row;
  if (cmd.position === "after") {
    start++;
  }
  for (let i = 0; i < cmd.quantity; i++) {
    rows.push(i + start);
  }
  return {
    type: "REMOVE_ROWS",
    rows,
    sheetId: cmd.sheetId,
  };
}

function inverseAddMerge(cmd: AddMergeCommand): RemoveMergeCommand {
  return { type: "REMOVE_MERGE", sheetId: cmd.sheetId, zone: cmd.zone };
}

function inverseRemoveMerge(cmd: RemoveMergeCommand): AddMergeCommand {
  return { type: "ADD_MERGE", sheetId: cmd.sheetId, zone: cmd.zone };
}

function inverseCreateSheet(cmd: CreateSheetCommand): DeleteSheetCommand {
  return { type: "DELETE_SHEET", sheetId: cmd.sheetId };
}

function inverseDuplicateSheet(cmd: DuplicateSheetCommand): DeleteSheetCommand {
  return { type: "DELETE_SHEET", sheetId: cmd.sheetIdTo };
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
