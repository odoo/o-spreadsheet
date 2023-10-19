import { expandZoneOnInsertion, reduceZoneOnDeletion } from "../../helpers";
import { CoreCommand, RangeData, UnboundedZone, Zone } from "../../types";

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

export function transformRangeData(range: RangeData, executed: CoreCommand): RangeData | undefined {
  const deletedSheet = executed.type === "DELETE_SHEET" && executed.sheetId;

  if ("sheetId" in executed && range._sheetId !== executed.sheetId) {
    return range;
  } else {
    const newZone = transformZone(range._zone, executed);
    if (newZone && deletedSheet !== range._sheetId) {
      return { ...range, _zone: newZone };
    }
  }
  return undefined;
}
