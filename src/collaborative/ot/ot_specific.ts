import { overlap } from "../../helpers";
import { transformDefinition } from "../../helpers/charts";
import { otRegistry } from "../../registries";
import {
  AddColumnsRowsCommand,
  AddMergeCommand,
  CreateChartCommand,
  CreateFilterTableCommand,
  CreateSheetCommand,
  DeleteFigureCommand,
  DeleteSheetCommand,
  FreezeColumnsCommand,
  FreezeRowsCommand,
  MoveRangeCommand,
  MoveReferencesCommand,
  RemoveColumnsRowsCommand,
  RemoveMergeCommand,
  UpdateChartCommand,
  UpdateFigureCommand,
  Zone,
} from "../../types";
import { transformPositionWithGrid, transformZone } from "./ot_helpers";

/*
 * This file contains the specifics transformations
 */

otRegistry.addTransformation(
  "ADD_COLUMNS_ROWS",
  ["CREATE_CHART", "UPDATE_CHART"],
  updateChartRangesTransformation
);
otRegistry.addTransformation(
  "REMOVE_COLUMNS_ROWS",
  ["CREATE_CHART", "UPDATE_CHART"],
  updateChartRangesTransformation
);
otRegistry.addTransformation(
  "DELETE_SHEET",
  ["MOVE_RANGES", "MOVE_REFERENCES"],
  transformTargetSheetId
);
otRegistry.addTransformation("ADD_COLUMNS_ROWS", ["MOVE_REFERENCES"], moveReferencesTransformation);
otRegistry.addTransformation(
  "REMOVE_COLUMNS_ROWS",
  ["MOVE_REFERENCES"],
  moveReferencesTransformation
);
otRegistry.addTransformation("DELETE_FIGURE", ["UPDATE_FIGURE", "UPDATE_CHART"], updateChartFigure);
otRegistry.addTransformation("CREATE_SHEET", ["CREATE_SHEET"], createSheetTransformation);
otRegistry.addTransformation(
  "ADD_MERGE",
  ["ADD_MERGE", "REMOVE_MERGE", "CREATE_FILTER_TABLE"],
  mergeTransformation
);
otRegistry.addTransformation(
  "ADD_COLUMNS_ROWS",
  ["FREEZE_COLUMNS", "FREEZE_ROWS"],
  freezeTransformation
);
otRegistry.addTransformation(
  "REMOVE_COLUMNS_ROWS",
  ["FREEZE_COLUMNS", "FREEZE_ROWS"],
  freezeTransformation
);
otRegistry.addTransformation(
  "CREATE_FILTER_TABLE",
  ["CREATE_FILTER_TABLE", "ADD_MERGE"],
  createTableTransformation
);

function transformTargetSheetId(
  cmd: MoveRangeCommand,
  executed: DeleteSheetCommand
): MoveRangeCommand | undefined {
  const deletedSheetId = executed.sheetId;
  if (cmd.targetSheetId === deletedSheetId || cmd.sheetId === deletedSheetId) {
    return undefined;
  }
  return cmd;
}

function updateChartFigure(
  toTransform: UpdateFigureCommand | UpdateChartCommand,
  executed: DeleteFigureCommand
): UpdateFigureCommand | UpdateChartCommand | undefined {
  if (toTransform.id === executed.id) {
    return undefined;
  }
  return toTransform;
}

function updateChartRangesTransformation(
  toTransform: UpdateChartCommand | CreateChartCommand,
  executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
): UpdateChartCommand | CreateChartCommand {
  return {
    ...toTransform,
    definition: transformDefinition(toTransform.definition, executed),
  };
}

function createSheetTransformation(
  cmd: CreateSheetCommand,
  executed: CreateSheetCommand
): CreateSheetCommand {
  if (cmd.name === executed.name) {
    return {
      ...cmd,
      name: cmd.name?.match(/\d+/)
        ? cmd.name.replace(/\d+/, (n) => (parseInt(n) + 1).toString())
        : `${cmd.name}~`,
      position: cmd.position + 1,
    };
  }
  return cmd;
}

function mergeTransformation(
  cmd: AddMergeCommand | RemoveMergeCommand | CreateFilterTableCommand,
  executed: AddMergeCommand
): AddMergeCommand | RemoveMergeCommand | CreateFilterTableCommand | undefined {
  if (cmd.sheetId !== executed.sheetId) {
    return cmd;
  }
  const target: Zone[] = [];
  for (const zone1 of cmd.target) {
    for (const zone2 of executed.target) {
      if (!overlap(zone1, zone2)) {
        target.push({ ...zone1 });
      }
    }
  }
  if (target.length) {
    return { ...cmd, target };
  }
  return undefined;
}

function freezeTransformation(
  cmd: FreezeColumnsCommand | FreezeRowsCommand,
  executed: RemoveColumnsRowsCommand | AddColumnsRowsCommand
): FreezeColumnsCommand | FreezeRowsCommand | undefined {
  if (cmd.sheetId !== executed.sheetId) {
    return cmd;
  }
  const dimension = cmd.type === "FREEZE_COLUMNS" ? "COL" : "ROW";
  if (dimension !== executed.dimension) {
    return cmd;
  }
  let quantity = cmd["quantity"];
  if (executed.type === "REMOVE_COLUMNS_ROWS") {
    const executedElements = [...executed.elements].sort((a, b) => b - a);
    for (let removedElement of executedElements) {
      if (quantity > removedElement) {
        quantity--;
      }
    }
  }
  if (executed.type === "ADD_COLUMNS_ROWS") {
    const executedBase = executed.position === "before" ? executed.base - 1 : executed.base;
    quantity = quantity > executedBase ? quantity + executed.quantity : quantity;
  }
  return quantity > 0 ? { ...cmd, quantity } : undefined;
}

/**
 * Cancel CREATE_FILTER_TABLE and ADD_MERGE commands if they overlap a filter
 */
function createTableTransformation(
  cmd: CreateFilterTableCommand | AddMergeCommand,
  executed: CreateFilterTableCommand
): CreateFilterTableCommand | AddMergeCommand | undefined {
  if (cmd.sheetId !== executed.sheetId) {
    return cmd;
  }

  for (const cmdTarget of cmd.target) {
    for (const executedCmdTarget of executed.target) {
      if (overlap(executedCmdTarget, cmdTarget)) {
        return undefined;
      }
    }
  }
  return cmd;
}

function moveReferencesTransformation(
  toTransform: MoveReferencesCommand,
  executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
): MoveReferencesCommand | undefined {
  if (toTransform.sheetId === executed.sheetId) {
    const newZone = transformZone(toTransform.zone, executed);
    if (!newZone) {
      return undefined;
    }
    toTransform = { ...toTransform, zone: newZone };
  }

  if (toTransform.targetSheetId === executed.sheetId) {
    const targetPosition = { col: toTransform.targetCol, row: toTransform.targetRow };
    const newTargetPosition = transformPositionWithGrid(targetPosition, executed);
    if (!newTargetPosition) {
      return undefined;
    }
    toTransform = {
      ...toTransform,
      targetCol: newTargetPosition.col,
      targetRow: newTargetPosition.row,
    };
  }

  return toTransform;
}
