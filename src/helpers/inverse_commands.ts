import {
  AddColumnsCommand,
  AddRowsCommand,
  CoreCommand,
  RemoveColumnsCommand,
  RemoveRowsCommand,
} from "../types";

export function inverseCommand(cmd: CoreCommand): CoreCommand {
  switch (cmd.type) {
    case "ADD_COLUMNS":
      return inverseAddColumns(cmd);
    case "ADD_ROWS":
      return inverseAddRows(cmd);
    // case "REMOVE_COLUMNS":
    //   return inverseRemoveColumns(cmd);
    default:
      console.warn(`No inverse implementation of ${cmd.type}`);
      return cmd;
  }
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