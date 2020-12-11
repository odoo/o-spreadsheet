import {
  AddColumnsCommand,
  AddRowsCommand,
  CoreCommand,
  CoreCommandTypes,
  RemoveColumnsCommand,
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
  RESIZE_COLUMNS: todo,
  RESIZE_ROWS: todo,

  /** MERGE */
  ADD_MERGE: todo,
  REMOVE_MERGE: todo,

  /** SHEETS MANIPULATION */
  CREATE_SHEET: todo,
  DELETE_SHEET: todo,
  DUPLICATE_SHEET: todo,
  MOVE_SHEET: todo,
  RENAME_SHEET: todo,

  /** CONDITIONAL FORMAT */
  ADD_CONDITIONAL_FORMAT: todo,
  REMOVE_CONDITIONAL_FORMAT: todo,

  /** FIGURES */
  CREATE_FIGURE: todo,
  DELETE_FIGURE: todo,
  UPDATE_FIGURE: todo,

  /** FORMATTING */
  SET_FORMATTING: todo,
  CLEAR_FORMATTING: todo,
  SET_BORDER: todo,
  SET_DECIMAL: todo,

  /** CHART */
  CREATE_CHART: todo,
  UPDATE_CHART: todo,
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

// function inverseRemoveColumns(cmd: RemoveColumnsCommand): AddColumnsCommand {

// }
