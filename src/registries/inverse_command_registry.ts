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
  DeleteColumnsCommand,
  DeleteFigureCommand,
  DeleteRowsCommand,
  DeleteSheetCommand,
  DuplicateSheetCommand,
  DeleteMergeCommand,
} from "../types/commands";

type InverseFunction = (cmd: CoreCommand) => CoreCommand[];

export const inverseCommandRegistry = new Registry<InverseFunction>()

  .add("ADD_COLUMNS", inverseAddColumns)
  .add("ADD_ROWS", inverseAddRows)
  .add("DELETE_COLUMNS", inverseRemoveColumns)
  .add("DELETE_ROWS", inverseRemoveRows)
  .add("ADD_MERGE", inverseAddMerge)
  .add("DELETE_MERGE", inverseRemoveMerge)
  .add("CREATE_SHEET", inverseCreateSheet)
  .add("DELETE_SHEET", inverseDeleteSheet)
  .add("DUPLICATE_SHEET", inverseDuplicateSheet)
  .add("CREATE_FIGURE", inverseCreateFigure)
  .add("CREATE_CHART", inverseCreateChart);

function inverseAddColumns(cmd: AddColumnsCommand): DeleteColumnsCommand[] {
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
      type: "DELETE_COLUMNS",
      columns,
      sheetId: cmd.sheetId,
    },
  ];
}

function inverseAddRows(cmd: AddRowsCommand): DeleteRowsCommand[] {
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
      type: "DELETE_ROWS",
      rows,
      sheetId: cmd.sheetId,
    },
  ];
}

function inverseAddMerge(cmd: AddMergeCommand): DeleteMergeCommand[] {
  return [{ type: "DELETE_MERGE", sheetId: cmd.sheetId, zone: cmd.zone }];
}

function inverseRemoveMerge(cmd: DeleteMergeCommand): AddMergeCommand[] {
  return [{ type: "ADD_MERGE", sheetId: cmd.sheetId, zone: cmd.zone }];
}

function inverseCreateSheet(cmd: CreateSheetCommand): DeleteSheetCommand[] {
  return [{ type: "DELETE_SHEET", sheetId: cmd.sheetId }];
}

function inverseDuplicateSheet(cmd: DuplicateSheetCommand): DeleteSheetCommand[] {
  return [{ type: "DELETE_SHEET", sheetId: cmd.sheetIdTo }];
}

function inverseRemoveColumns(cmd: DeleteColumnsCommand): AddColumnsCommand[] {
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

function inverseRemoveRows(cmd: DeleteRowsCommand): AddRowsCommand[] {
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
  return [{ type: "DELETE_FIGURE", id: cmd.figure.id, sheetId: cmd.sheetId }];
}

function inverseCreateChart(cmd: CreateChartCommand): DeleteFigureCommand[] {
  return [{ type: "DELETE_FIGURE", id: cmd.id, sheetId: cmd.sheetId }];
}
