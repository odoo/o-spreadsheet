import { expandZoneOnInsertion } from "../../helpers";
import { otRegistry } from "../../registries";
import {
  AddColumnsCommand,
  AddMergeCommand,
  AddRowsCommand,
  RemoveMergeCommand,
  Zone,
} from "../../types";
import {
  ColumnsCommand,
  PositionalCommand,
  RowsCommand,
  TargetCommand,
} from "../../types/collaborative/ot_types";
import { withSheetCheck } from "./ot_helpers";

otRegistry.addTransformation(
  "ADD_COLUMNS",
  ["UPDATE_CELL", "UPDATE_CELL_POSITION", "CLEAR_CELL", "SET_BORDER"],
  withSheetCheck(cellCommand)
);

otRegistry.addTransformation(
  "ADD_ROWS",
  ["UPDATE_CELL", "UPDATE_CELL_POSITION", "CLEAR_CELL", "SET_BORDER"],
  withSheetCheck(cellCommand)
);

otRegistry.addTransformation(
  "ADD_COLUMNS",
  ["DELETE_CONTENT", "SET_FORMATTING", "CLEAR_FORMATTING", "SET_DECIMAL"],
  withSheetCheck(targetCommand)
);

otRegistry.addTransformation(
  "ADD_ROWS",
  ["DELETE_CONTENT", "SET_FORMATTING", "CLEAR_FORMATTING", "SET_DECIMAL"],
  withSheetCheck(targetCommand)
);

otRegistry.addTransformation(
  "ADD_COLUMNS",
  ["ADD_MERGE", "REMOVE_MERGE"],
  withSheetCheck(mergeCommand)
);

otRegistry.addTransformation(
  "ADD_ROWS",
  ["ADD_MERGE", "REMOVE_MERGE"],
  withSheetCheck(mergeCommand)
);

otRegistry.addTransformation("ADD_COLUMNS", ["ADD_COLUMNS"], withSheetCheck(addColumnsCommand));

otRegistry.addTransformation("ADD_ROWS", ["ADD_ROWS"], withSheetCheck(addRowsCommand));

otRegistry.addTransformation(
  "ADD_COLUMNS",
  ["RESIZE_COLUMNS", "REMOVE_COLUMNS"],
  withSheetCheck(columnsCommand)
);

otRegistry.addTransformation(
  "ADD_ROWS",
  ["RESIZE_ROWS", "REMOVE_ROWS"],
  withSheetCheck(rowsCommand)
);

function cellCommand(
  toTransform: PositionalCommand,
  executed: AddColumnsCommand | AddRowsCommand
): PositionalCommand {
  let updated: number;
  let pivot: number;
  let element: "col" | "row";
  if (executed.type === "ADD_COLUMNS") {
    updated = toTransform.col;
    pivot = executed.column;
    element = "col";
  } else {
    updated = toTransform.row;
    pivot = executed.row;
    element = "row";
  }
  if (updated > pivot || (updated === pivot && executed.position === "before")) {
    return { ...toTransform, [element]: updated + executed.quantity };
  }
  return toTransform;
}

function targetCommand(
  toTransform: TargetCommand,
  executed: AddColumnsCommand | AddRowsCommand
): TargetCommand {
  return {
    ...toTransform,
    target: toTransform.target.map((zone) => transformZone(zone, executed)),
  };
}

function mergeCommand(
  toTransform: AddMergeCommand | RemoveMergeCommand,
  executed: AddColumnsCommand
): AddMergeCommand | RemoveMergeCommand {
  return { ...toTransform, zone: transformZone(toTransform.zone, executed) };
}

function transformZone(zone: Zone, executed: AddColumnsCommand | AddRowsCommand): Zone {
  return executed.type === "ADD_COLUMNS"
    ? expandZoneOnInsertion(zone, "left", executed.column, executed.position, executed.quantity)
    : expandZoneOnInsertion(zone, "top", executed.row, executed.position, executed.quantity);
}

function addColumnsCommand(
  toTransform: AddColumnsCommand,
  executed: AddColumnsCommand
): AddColumnsCommand {
  return {
    ...toTransform,
    column: onAddElement(toTransform.column, executed.column, executed.position, executed.quantity),
  };
}

function addRowsCommand(toTransform: AddRowsCommand, executed: AddRowsCommand): AddRowsCommand {
  return {
    ...toTransform,
    row: onAddElement(toTransform.row, executed.row, executed.position, executed.quantity),
  };
}

function onAddElement(
  toTransform: number,
  element: number,
  position: "before" | "after",
  quantity: number
): number {
  const base = position === "before" ? element - 1 : element;
  if (base < toTransform) {
    return toTransform + quantity;
  }
  return toTransform;
}

function columnsCommand(toTransform: ColumnsCommand, executed: AddColumnsCommand): ColumnsCommand {
  return {
    ...toTransform,
    columns: onTransformCommand(
      toTransform.columns,
      executed.column,
      executed.position,
      executed.quantity
    ),
  };
}

function rowsCommand(toTransform: RowsCommand, executed: AddRowsCommand): RowsCommand {
  return {
    ...toTransform,
    rows: onTransformCommand(toTransform.rows, executed.row, executed.position, executed.quantity),
  };
}

function onTransformCommand(
  elements: number[],
  element: number,
  position: "before" | "after",
  quantity: number
): number[] {
  const base = position === "before" ? element - 1 : element;
  return elements.map((el) => (el > base ? el + quantity : el));
}
