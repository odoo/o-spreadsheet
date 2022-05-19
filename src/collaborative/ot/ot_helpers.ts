import { expandZoneOnInsertion, reduceZoneOnDeletion } from "../../helpers";
import { CoreCommand, UnboundedZone, Zone } from "../../types";

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
