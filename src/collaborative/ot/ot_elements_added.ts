import { expandZoneOnInsertion } from "../../helpers";
import { otRegistry } from "../../registries";
import {
  AddColumnsRowsCommand,
  RemoveColumnsRowsCommand,
  ResizeColumnsRowsCommand,
  Zone,
} from "../../types";
import { PositionalCommand, TargetCommand } from "../../types/collaborative/ot_types";
import { withSheetCheck } from "./ot_helpers";

otRegistry.addTransformation(
  "ADD_COLUMNS_ROWS",
  ["UPDATE_CELL", "UPDATE_CELL_POSITION", "CLEAR_CELL", "SET_BORDER"],
  withSheetCheck(cellCommand)
);

otRegistry.addTransformation(
  "ADD_COLUMNS_ROWS",
  ["DELETE_CONTENT", "SET_FORMATTING", "CLEAR_FORMATTING", "SET_DECIMAL"],
  withSheetCheck(targetCommand)
);

otRegistry.addTransformation(
  "ADD_COLUMNS_ROWS",
  ["ADD_MERGE", "REMOVE_MERGE"],
  withSheetCheck(targetCommand)
);

otRegistry.addTransformation(
  "ADD_COLUMNS_ROWS",
  ["ADD_COLUMNS_ROWS"],
  withSheetCheck(addColumnsRowCommand)
);

otRegistry.addTransformation(
  "ADD_COLUMNS_ROWS",
  ["RESIZE_COLUMNS_ROWS", "REMOVE_COLUMNS_ROWS"],
  withSheetCheck(columnsRowCommand)
);

function cellCommand(
  toTransform: PositionalCommand,
  executed: AddColumnsRowsCommand
): PositionalCommand {
  const pivot: number = executed.base;
  const element: "col" | "row" = executed.dimension === "COL" ? "col" : "row";
  const updated: number = toTransform[element];
  if (updated > pivot || (updated === pivot && executed.position === "before")) {
    return { ...toTransform, [element]: updated + executed.quantity };
  }
  return toTransform;
}

function targetCommand(toTransform: TargetCommand, executed: AddColumnsRowsCommand): TargetCommand {
  return {
    ...toTransform,
    target: toTransform.target.map((zone) => transformZone(zone, executed)),
  };
}

function transformZone(zone: Zone, executed: AddColumnsRowsCommand): Zone {
  const start = executed.dimension === "COL" ? "left" : "top";
  return expandZoneOnInsertion(zone, start, executed.base, executed.position, executed.quantity);
}

function addColumnsRowCommand(
  toTransform: AddColumnsRowsCommand,
  executed: AddColumnsRowsCommand
): AddColumnsRowsCommand | undefined {
  if (toTransform.dimension === executed.dimension) {
    return {
      ...toTransform,
      base: shiftCommandIfNeeded(
        toTransform.base,
        executed.base,
        executed.position,
        executed.quantity
      ),
    };
  }
  return undefined;
}

function columnsRowCommand(
  toTransform: ResizeColumnsRowsCommand | RemoveColumnsRowsCommand,
  executed: AddColumnsRowsCommand
): ResizeColumnsRowsCommand | RemoveColumnsRowsCommand | undefined {
  if (toTransform.dimension === executed.dimension) {
    return {
      ...toTransform,
      elements: toTransform.elements.map((element: number) =>
        shiftCommandIfNeeded(element, executed.base, executed.position, executed.quantity)
      ),
    };
  }
  return undefined;
}

function shiftCommandIfNeeded(
  element: number,
  base: number,
  position: "before" | "after",
  quantity: number
): number {
  const positionalBase = position === "before" ? base - 1 : base;
  return element > positionalBase ? element + quantity : element;
}
