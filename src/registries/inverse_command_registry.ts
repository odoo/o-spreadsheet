import { groupConsecutive } from "../helpers/index";
import { Registry } from "../registry";
import {
  AddColumnsCommand,
  AddMergeCommand,
  AddRowsCommand,
  CoreCommand,
  CreateChartCommand,
  CreateFigureCommand,
  CreateSheetCommand,
  DeleteFigureCommand,
  DeleteSheetCommand,
  DuplicateSheetCommand,
  RemoveColumnsCommand,
  RemoveMergeCommand,
  RemoveRowsCommand,
} from "../types/commands";

type InverseFunction = (cmd: CoreCommand) => CoreCommand[];

export const inverseCommandRegistry = new Registry<InverseFunction>()

  .add("UPDATE_CELL", identity)
  .add("UPDATE_CELL_POSITION", identity)
  .add("CLEAR_CELL", identity)
  .add("DELETE_CONTENT", identity)
  .add("ADD_COLUMNS", inverseAddColumns)
  .add("ADD_ROWS", inverseAddRows)
  .add("REMOVE_COLUMNS", inverseRemoveColumns)
  .add("REMOVE_ROWS", inverseRemoveRows)
  .add("RESIZE_COLUMNS", identity)
  .add("RESIZE_ROWS", identity)
  .add("ADD_MERGE", inverseAddMerge)
  .add("REMOVE_MERGE", inverseRemoveMerge)
  .add("CREATE_SHEET", inverseCreateSheet)
  .add("DELETE_SHEET", inverseDeleteSheet)
  .add("DUPLICATE_SHEET", inverseDuplicateSheet)
  .add("MOVE_SHEET", identity)
  .add("RENAME_SHEET", identity)

  // Conditional_format is not used in the transformations, we can let them
  .add("ADD_CONDITIONAL_FORMAT", identity)
  .add("REMOVE_CONDITIONAL_FORMAT", identity)
  .add("DELETE_FIGURE", identity)
  .add("CREATE_FIGURE", inverseCreateFigure)
  .add("UPDATE_FIGURE", identity)
  .add("SET_FORMATTING", identity)
  .add("CLEAR_FORMATTING", identity)
  .add("SET_BORDER", identity)
  .add("SET_DECIMAL", identity)
  .add("CREATE_CHART", inverseCreateChart)
  .add("UPDATE_CHART", identity);

function identity(cmd: CoreCommand): CoreCommand[] {
  return [cmd];
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
  return [
    {
      type: "REMOVE_COLUMNS",
      columns,
      sheetId: cmd.sheetId,
    },
  ];
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
  return [
    {
      type: "REMOVE_ROWS",
      rows,
      sheetId: cmd.sheetId,
    },
  ];
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

function inverseRemoveColumns(cmd: RemoveColumnsCommand): AddColumnsCommand[] {
  const commands: AddColumnsCommand[] = [];
  for (let group of groupConsecutive(cmd.columns.sort((a, b) => a - b))) {
    const column = group[0] === 0 ? 0 : group[0] - 1;
    const position = group[0] === 0 ? "before" : "after";
    commands.push({
      type: "ADD_COLUMNS",
      quantity: group.length,
      column,
      sheetId: cmd.sheetId,
      position,
    });
  }
  return commands;
}

function inverseRemoveRows(cmd: RemoveRowsCommand): AddRowsCommand[] {
  const commands: AddRowsCommand[] = [];
  for (let group of groupConsecutive(cmd.rows.sort((a, b) => a - b))) {
    const row = group[0] === 0 ? 0 : group[0] - 1;
    const position = group[0] === 0 ? "before" : "after";
    commands.push({
      type: "ADD_ROWS",
      quantity: group.length,
      row,
      sheetId: cmd.sheetId,
      position,
    });
  }
  return commands;
}

function inverseDeleteSheet(cmd: DeleteSheetCommand): CreateSheetCommand[] {
  return [{ type: "CREATE_SHEET", sheetId: cmd.sheetId, position: 1 }];
}

function inverseCreateFigure(cmd: CreateFigureCommand): DeleteFigureCommand[] {
  return [{ type: "DELETE_FIGURE", id: cmd.figure.id }];
}

function inverseCreateChart(cmd: CreateChartCommand): DeleteFigureCommand[] {
  return [{ type: "DELETE_FIGURE", id: cmd.id }];
}
