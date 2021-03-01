import { isDefined, reduceZoneOnDeletion } from "../../helpers";
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
  "REMOVE_COLUMNS_ROWS",
  ["UPDATE_CELL", "UPDATE_CELL_POSITION", "CLEAR_CELL", "SET_BORDER"],
  withSheetCheck(cellCommand)
);

otRegistry.addTransformation(
  "REMOVE_COLUMNS_ROWS",
  ["DELETE_CONTENT", "SET_FORMATTING", "CLEAR_FORMATTING", "SET_DECIMAL"],
  withSheetCheck(targetCommand)
);

otRegistry.addTransformation(
  "REMOVE_COLUMNS_ROWS",
  ["ADD_MERGE", "REMOVE_MERGE"],
  withSheetCheck(targetCommand)
);

otRegistry.addTransformation(
  "REMOVE_COLUMNS_ROWS",
  ["REMOVE_COLUMNS_ROWS", "RESIZE_COLUMNS_ROWS"],
  withSheetCheck(columnsCommand)
);

otRegistry.addTransformation(
  "REMOVE_COLUMNS_ROWS",
  ["ADD_COLUMNS_ROWS"],
  withSheetCheck(addColumnsRowsCommand)
);

function cellCommand(
  toTransform: PositionalCommand,
  executed: RemoveColumnsRowsCommand
): PositionalCommand | undefined {
  const element: "col" | "row" = executed.dimension === "COL" ? "col" : "row";
  let base: number = toTransform[element];
  const elements = executed.elements;
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
  executed: RemoveColumnsRowsCommand
): TargetCommand | undefined {
  const adaptedTarget = toTransform.target
    .map((zone) => transformZone(zone, executed))
    .filter(isDefined);
  if (!adaptedTarget.length) {
    return undefined;
  }
  return { ...toTransform, target: adaptedTarget };
}

function transformZone(zone: Zone, executed: RemoveColumnsRowsCommand): Zone | undefined {
  const start = executed.dimension === "COL" ? "left" : "top";
  return reduceZoneOnDeletion(zone, start, executed.elements);
}

function columnsCommand(
  toTransform: RemoveColumnsRowsCommand | ResizeColumnsRowsCommand,
  executed: RemoveColumnsRowsCommand
): RemoveColumnsRowsCommand | ResizeColumnsRowsCommand | undefined {
  if (toTransform.dimension === executed.dimension) {
    const elements = onRemoveElements(toTransform.elements, executed.elements);
    if (!elements.length) {
      return undefined;
    }
    return { ...toTransform, elements };
  }
  return toTransform;
}

/**
 * Transform an array of rows or columns (to remove) if some rows or columns
 * have been previously removed concurrently.
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

function addColumnsRowsCommand(
  toTransform: AddColumnsRowsCommand,
  executed: RemoveColumnsRowsCommand
): AddColumnsRowsCommand | undefined {
  if (toTransform.dimension === executed.dimension) {
    const base = onAddElements(toTransform.base, executed.elements);
    return base !== undefined ? { ...toTransform, base } : undefined;
  }
  return undefined;
}

/**
 * Transform an array of rows or columns (to remove) if some rows or columns
 * have been previously added concurrently.
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
