import { groupConsecutive } from "../helpers/index";
import type {
  AddColumnsRowsCommand,
  AddMergeCommand,
  CoreCommand,
  CreateChartCommand,
  CreateFigureCommand,
  CreateSheetCommand,
  DeleteFigureCommand,
  DeleteSheetCommand,
  DuplicateSheetCommand,
  HideColumnsRowsCommand,
  RemoveColumnsRowsCommand,
  RemoveMergeCommand,
  UnhideColumnsRowsCommand,
} from "../types/commands";
import { coreTypes } from "../types/commands";
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
  .add("UNHIDE_COLUMNS_ROWS", inverseUnhideColumnsRows);

for (const cmd of coreTypes.values()) {
  if (!inverseCommandRegistry.contains(cmd)) {
    inverseCommandRegistry.add(cmd, identity);
  }
}

function identity(cmd: CoreCommand): CoreCommand[] {
  return [cmd];
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
  return [{ type: "DELETE_SHEET", sheetId: cmd.sheetId }];
}

function inverseDuplicateSheet(cmd: DuplicateSheetCommand): DeleteSheetCommand[] {
  return [{ type: "DELETE_SHEET", sheetId: cmd.sheetIdTo }];
}

function inverseRemoveColumnsRows(cmd: RemoveColumnsRowsCommand): AddColumnsRowsCommand[] {
  const commands: AddColumnsRowsCommand[] = [];
  const elements = [...cmd.elements].sort((a, b) => a - b);
  for (let group of groupConsecutive(elements)) {
    const column = group[0] === 0 ? 0 : group[0] - 1;
    const position = group[0] === 0 ? "before" : "after";
    commands.push({
      type: "ADD_COLUMNS_ROWS",
      dimension: cmd.dimension,
      quantity: group.length,
      base: column,
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
