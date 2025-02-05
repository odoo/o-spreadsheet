import { expandZoneOnInsertion, reduceZoneOnDeletion } from "../../helpers";
import {
  AddColumnsRowsCommand,
  CoreCommand,
  Position,
  RemoveColumnsRowsCommand,
  UnboundedZone,
  Zone,
} from "../../types";

export function transformZone<Z extends Zone | UnboundedZone>(
  zone: Z,
  executed: CoreCommand
): Z | undefined {
  if (executed.type === "REMOVE_COLUMNS_ROWS") {
    return reduceZoneOnDeletion(
      zone,
      executed.dimension === "COL" ? "left" : "top",
      executed.elements
    );
  }
  if (executed.type === "ADD_COLUMNS_ROWS") {
    return expandZoneOnInsertion(
      zone,
      executed.dimension === "COL" ? "left" : "top",
      executed.base,
      executed.position,
      executed.quantity
    );
  }
  return { ...zone };
}

/**
 * Transform a PositionDependentCommand after a grid shape modification. This
 * transformation consists of updating the position.
 */
export function transformPositionWithGrid(
  position: Position,
  executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
): Position | undefined {
  const field = executed.dimension === "COL" ? "col" : "row";
  let base = position[field];
  if (executed.type === "REMOVE_COLUMNS_ROWS") {
    const elements = [...executed.elements].sort((a, b) => b - a);
    if (elements.includes(base)) {
      return undefined;
    }
    for (let removedElement of elements) {
      if (base >= removedElement) {
        base--;
      }
    }
  }
  if (executed.type === "ADD_COLUMNS_ROWS") {
    if (base > executed.base || (base === executed.base && executed.position === "before")) {
      base = base + executed.quantity;
    }
  }
  return { ...position, [field]: base };
}
