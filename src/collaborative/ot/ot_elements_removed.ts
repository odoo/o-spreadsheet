import { isDefined, reduceZoneOnDeletion } from "../../helpers";
import { otRegistry } from "../../registries";
import {
  AddColumnsCommand,
  AddMergeCommand,
  AddRowsCommand,
  DeleteColumnsCommand,
  DeleteRowsCommand,
  Zone,
} from "../../types";
import {
  ColumnsCommand,
  PositionalCommand,
  RowsCommand,
  TargetCommand,
} from "../../types/ot_types";
import { withSheetCheck } from "./ot_helpers";

type ExecutedCommand = DeleteColumnsCommand | DeleteRowsCommand;

otRegistry.addTransformation(
  "DELETE_COLUMNS",
  ["UPDATE_CELL", "UPDATE_CELL_POSITION", "CLEAR_CELL", "SET_BORDER"],
  withSheetCheck(cellCommand)
);

otRegistry.addTransformation(
  "DELETE_ROWS",
  ["UPDATE_CELL", "UPDATE_CELL_POSITION", "CLEAR_CELL", "SET_BORDER"],
  withSheetCheck(cellCommand)
);

otRegistry.addTransformation(
  "DELETE_COLUMNS",
  ["DELETE_CONTENT", "SET_FORMATTING", "CLEAR_FORMATTING", "SET_DECIMAL"],
  withSheetCheck(targetCommand)
);

otRegistry.addTransformation(
  "DELETE_ROWS",
  ["DELETE_CONTENT", "SET_FORMATTING", "CLEAR_FORMATTING", "SET_DECIMAL"],
  withSheetCheck(targetCommand)
);

otRegistry.addTransformation(
  "DELETE_COLUMNS",
  ["ADD_MERGE", "DELETE_MERGE"],
  withSheetCheck(mergeCommand)
);

otRegistry.addTransformation(
  "DELETE_ROWS",
  ["ADD_MERGE", "DELETE_MERGE"],
  withSheetCheck(mergeCommand)
);

otRegistry.addTransformation(
  "DELETE_COLUMNS",
  ["DELETE_COLUMNS", "RESIZE_COLUMNS"],
  withSheetCheck(columnsCommand)
);

otRegistry.addTransformation(
  "DELETE_ROWS",
  ["RESIZE_ROWS", "DELETE_ROWS"],
  withSheetCheck(rowsCommand)
);

otRegistry.addTransformation("DELETE_COLUMNS", ["ADD_COLUMNS"], withSheetCheck(addColumnsCommand));

otRegistry.addTransformation("DELETE_ROWS", ["ADD_ROWS"], withSheetCheck(addRowsCommand));

function cellCommand(
  toTransform: PositionalCommand,
  executed: ExecutedCommand
): PositionalCommand | undefined {
  let base: number;
  let element: "col" | "row";
  let elements: number[];
  if (executed.type === "DELETE_COLUMNS") {
    base = toTransform.col;
    element = "col";
    elements = executed.columns;
  } else {
    element = "row";
    base = toTransform.row;
    elements = executed.rows;
  }
  if (elements.includes(base)) {
    return undefined;
  }
  for (let removedElement of elements) {
    if (base >= removedElement) {
      base--;
    }
  }
  return { ...toTransform, [element]: base };
}

function targetCommand(
  toTransform: TargetCommand,
  executed: ExecutedCommand
): TargetCommand | undefined {
  const adaptedTarget = toTransform.target
    .map((zone) => transformZone(zone, executed))
    .filter(isDefined);
  if (!adaptedTarget.length) {
    return undefined;
  }
  return { ...toTransform, target: adaptedTarget };
}

function transformZone(zone: Zone, executed: ExecutedCommand): Zone | undefined {
  return executed.type === "DELETE_COLUMNS"
    ? reduceZoneOnDeletion(zone, "left", executed.columns)
    : reduceZoneOnDeletion(zone, "top", executed.rows);
}

function mergeCommand(
  toTransform: AddMergeCommand,
  executed: ExecutedCommand
): AddMergeCommand | undefined {
  const zone = transformZone(toTransform.zone, executed);
  if (!zone) {
    return undefined;
  }
  return { ...toTransform, zone };
}

function columnsCommand(
  toTransform: ColumnsCommand,
  executed: DeleteColumnsCommand
): ColumnsCommand | undefined {
  const columns = onRemoveElements(toTransform.columns, executed.columns);
  if (!columns.length) {
    return undefined;
  }
  return { ...toTransform, columns };
}

function rowsCommand(
  toTransform: RowsCommand,
  executed: DeleteRowsCommand
): RowsCommand | undefined {
  const rows = onRemoveElements(toTransform.rows, executed.rows);
  if (!rows.length) {
    return undefined;
  }
  return { ...toTransform, rows };
}

/**
 * Transform an array of rows or columns (to remove) if some rows or columns
 * have been previoulsy removed concurrently.
 */
function onRemoveElements(toTransform: number[], removedElements: number[]): number[] {
  return toTransform
    .map((element) => {
      if (removedElements.includes(element)) {
        return undefined;
      }
      for (let removedElement of removedElements) {
        if (element > removedElement) {
          element--;
        }
      }
      return element;
    })
    .filter(isDefined);
}

function addColumnsCommand(
  toTransform: AddColumnsCommand,
  executed: DeleteColumnsCommand
): AddColumnsCommand | undefined {
  const column = onAddElements(toTransform.column, executed.columns);
  return column !== undefined ? { ...toTransform, column } : undefined;
}

function addRowsCommand(
  toTransform: AddRowsCommand,
  executed: DeleteRowsCommand
): AddRowsCommand | undefined {
  const row = onAddElements(toTransform.row, executed.rows);
  return row !== undefined ? { ...toTransform, row } : undefined;
}

/**
 * Transform an array of rows or columns (to remove) if some rows or columns
 * have been previoulsy added concurrently.
 */
function onAddElements(toTransform: number, elements: number[]): number | undefined {
  if (elements.includes(toTransform)) {
    return undefined;
  }
  let element = toTransform;
  for (let removedElement of elements) {
    if (element > removedElement) {
      element--;
    }
  }
  return element;
}
