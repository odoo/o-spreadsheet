import { expandZoneOnInsertion, reduceZoneOnDeletion } from "../../helpers";
import { CoreCommand, Zone } from "../../types";

export function transformZone(zone: Zone, executed: CoreCommand): Zone | undefined {
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
