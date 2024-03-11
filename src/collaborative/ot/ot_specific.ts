import {
  getAddHeaderStartIndex,
  moveHeaderIndexesOnHeaderAddition,
  moveHeaderIndexesOnHeaderDeletion,
  overlap,
  range,
} from "../../helpers";
import { transformDefinition } from "../../helpers/figures/charts";
import { DEFAULT_TABLE_CONFIG } from "../../helpers/table_presets";
import { otRegistry } from "../../registries";
import {
  AddColumnsRowsCommand,
  AddMergeCommand,
  CreateChartCommand,
  CreateSheetCommand,
  CreateTableCommand,
  DeleteFigureCommand,
  DeleteSheetCommand,
  DuplicatePivotCommand,
  FoldHeaderGroupCommand,
  FreezeColumnsCommand,
  FreezeRowsCommand,
  GroupHeadersCommand,
  HeaderIndex,
  InsertPivotCommand,
  MoveRangeCommand,
  RemoveColumnsRowsCommand,
  RemoveMergeCommand,
  RemovePivotCommand,
  RemoveTableStyleCommand,
  RenamePivotCommand,
  UnGroupHeadersCommand,
  UnfoldHeaderGroupCommand,
  UpdateChartCommand,
  UpdateFigureCommand,
  UpdatePivotCommand,
  UpdateTableCommand,
  Zone,
} from "../../types";
import { transformRangeData, transformZone } from "./ot_helpers";

/*
 * This file contains the specifics transformations
 */

otRegistry.addTransformation("ADD_COLUMNS_ROWS", ["ADD_COLUMNS_ROWS"], addHeadersTransformation);
otRegistry.addTransformation("REMOVE_COLUMNS_ROWS", ["ADD_COLUMNS_ROWS"], addHeadersTransformation);

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
otRegistry.addTransformation("DELETE_SHEET", ["MOVE_RANGES"], transformTargetSheetId);
otRegistry.addTransformation("DELETE_FIGURE", ["UPDATE_FIGURE", "UPDATE_CHART"], updateChartFigure);
otRegistry.addTransformation("CREATE_SHEET", ["CREATE_SHEET"], createSheetTransformation);
otRegistry.addTransformation("ADD_MERGE", ["ADD_MERGE", "REMOVE_MERGE"], mergeTransformation);
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
otRegistry.addTransformation("ADD_COLUMNS_ROWS", ["UPDATE_TABLE"], updateTableTransformation);
otRegistry.addTransformation("REMOVE_COLUMNS_ROWS", ["UPDATE_TABLE"], updateTableTransformation);
otRegistry.addTransformation(
  "REMOVE_TABLE_STYLE",
  ["CREATE_TABLE", "UPDATE_TABLE"],
  removeTableStyleTransform
);
otRegistry.addTransformation(
  "ADD_COLUMNS_ROWS",
  ["GROUP_HEADERS", "UNGROUP_HEADERS", "FOLD_HEADER_GROUP", "UNFOLD_HEADER_GROUP"],
  groupHeadersTransformation
);
otRegistry.addTransformation(
  "REMOVE_COLUMNS_ROWS",
  ["GROUP_HEADERS", "UNGROUP_HEADERS", "FOLD_HEADER_GROUP", "UNFOLD_HEADER_GROUP"],
  groupHeadersTransformation
);

otRegistry.addTransformation(
  "REMOVE_PIVOT",
  ["RENAME_PIVOT", "DUPLICATE_PIVOT", "INSERT_PIVOT", "UPDATE_PIVOT"],
  pivotTransformation
);

function pivotTransformation(
  toTransform: RenamePivotCommand | DuplicatePivotCommand | InsertPivotCommand | UpdatePivotCommand,
  executed: RemovePivotCommand
) {
  if (toTransform.pivotId === executed.pivotId) {
    return undefined;
  }
  return toTransform;
}

function transformTargetSheetId(
  toTransform: MoveRangeCommand,
  executed: DeleteSheetCommand
): MoveRangeCommand | undefined {
  const deletedSheetId = executed.sheetId;
  if (toTransform.targetSheetId === deletedSheetId || toTransform.sheetId === deletedSheetId) {
    return undefined;
  }
  return toTransform;
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
  toTransform: CreateSheetCommand,
  executed: CreateSheetCommand
): CreateSheetCommand {
  if (toTransform.name === executed.name) {
    return {
      ...toTransform,
      name: toTransform.name?.match(/\d+/)
        ? toTransform.name.replace(/\d+/, (n) => (parseInt(n) + 1).toString())
        : `${toTransform.name}~`,
      position: toTransform.position + 1,
    };
  }
  return toTransform;
}

function mergeTransformation(
  toTransform: AddMergeCommand | RemoveMergeCommand,
  executed: AddMergeCommand
): AddMergeCommand | RemoveMergeCommand | undefined {
  if (toTransform.sheetId !== executed.sheetId) {
    return toTransform;
  }

  const target: Zone[] = [];
  for (const zone1 of toTransform.target) {
    for (const zone2 of executed.target) {
      if (!overlap(zone1, zone2)) {
        target.push({ ...zone1 });
      }
    }
  }
  if (target.length) {
    return { ...toTransform, target };
  }
  return undefined;
}

function freezeTransformation(
  toTransform: FreezeColumnsCommand | FreezeRowsCommand,
  executed: RemoveColumnsRowsCommand | AddColumnsRowsCommand
): FreezeColumnsCommand | FreezeRowsCommand | undefined {
  if (toTransform.sheetId !== executed.sheetId) {
    return toTransform;
  }
  const dimension = toTransform.type === "FREEZE_COLUMNS" ? "COL" : "ROW";
  if (dimension !== executed.dimension) {
    return toTransform;
  }
  let quantity = toTransform["quantity"];
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
  return quantity > 0 ? { ...toTransform, quantity } : undefined;
}

/**
 * Update the zones of an UPDATE_TABLE command if some headers were added/removed
 */
function updateTableTransformation(
  toTransform: UpdateTableCommand,
  executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
): UpdateTableCommand | undefined {
  if (toTransform.sheetId !== executed.sheetId) {
    return toTransform;
  }
  const newCmdZone = transformZone(toTransform.zone, executed);
  if (!newCmdZone) {
    return undefined;
  }
  const newTableRange = toTransform.newTableRange
    ? transformRangeData(toTransform.newTableRange, executed)
    : undefined;
  return { ...toTransform, newTableRange, zone: newCmdZone };
}

function removeTableStyleTransform(
  toTransform: UpdateTableCommand | CreateTableCommand,
  executed: RemoveTableStyleCommand
): UpdateTableCommand | CreateTableCommand {
  if (toTransform.config?.styleId !== executed.tableStyleId) {
    return toTransform;
  }
  return {
    ...toTransform,
    config: { ...toTransform.config, styleId: DEFAULT_TABLE_CONFIG.styleId },
  } as UpdateTableCommand | CreateTableCommand;
}

/**
 * Transform ADD_COLUMNS_ROWS command if some headers were added/removed
 */
function addHeadersTransformation(
  toTransform: AddColumnsRowsCommand,
  executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
): AddColumnsRowsCommand | undefined {
  if (toTransform.sheetId !== executed.sheetId || toTransform.dimension !== executed.dimension) {
    return toTransform;
  }

  let result: HeaderIndex | undefined = undefined;
  if (executed.type === "REMOVE_COLUMNS_ROWS") {
    result = moveHeaderIndexesOnHeaderDeletion(executed.elements, [toTransform.base])[0];
  } else if (executed.type === "ADD_COLUMNS_ROWS") {
    const base = getAddHeaderStartIndex(executed.position, executed.base);
    result = moveHeaderIndexesOnHeaderAddition(base, executed.quantity, [toTransform.base])[0];
  }

  if (result === undefined) {
    return undefined;
  }

  return { ...toTransform, base: result };
}

type HeaderGroupCommand =
  | GroupHeadersCommand
  | UnGroupHeadersCommand
  | FoldHeaderGroupCommand
  | UnfoldHeaderGroupCommand;

/**
 * Transform header group command if some headers were added/removed
 */
function groupHeadersTransformation(
  toTransform: HeaderGroupCommand,
  executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
): HeaderGroupCommand | undefined {
  if (toTransform.sheetId !== executed.sheetId || toTransform.dimension !== executed.dimension) {
    return toTransform;
  }

  const elementsToTransform = range(toTransform.start, toTransform.end + 1);
  let results: HeaderIndex[] = [];
  if (executed.type === "REMOVE_COLUMNS_ROWS") {
    results = moveHeaderIndexesOnHeaderDeletion(executed.elements, elementsToTransform);
  } else if (executed.type === "ADD_COLUMNS_ROWS") {
    const base = getAddHeaderStartIndex(executed.position, executed.base);
    results = moveHeaderIndexesOnHeaderAddition(base, executed.quantity, elementsToTransform);
  }

  if (results.length === 0) {
    return undefined;
  }

  return { ...toTransform, start: Math.min(...results), end: Math.max(...results) };
}
