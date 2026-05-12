import { expandZoneOnInsertion, reduceZoneOnDeletion } from "../../helpers/zones";
import { CoreCommand, SheetDependentCommand } from "../../types/commands";
import { UnboundedZone, Zone } from "../../types/misc";
import { RangeData } from "../../types/range";

export type TransformResult = "SKIP_TRANSFORMATION" | "IGNORE_COMMAND";

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
  return zone;
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

export function transformSheetId(
  toTransform: Extract<CoreCommand, SheetDependentCommand>,
  executed: CoreCommand
): CoreCommand | TransformResult {
  if (!("sheetId" in executed)) {
    return toTransform;
  }

  const deleteSheet = executed.type === "DELETE_SHEET" && executed.sheetId;
  const lockSheet = executed.type === "LOCK_SHEET" && executed.sheetId;
  if (toTransform.sheetId === deleteSheet || toTransform.sheetId === lockSheet) {
    return "IGNORE_COMMAND";
  } else if (
    toTransform.type === "CREATE_SHEET" ||
    executed.type === "CREATE_SHEET" ||
    toTransform.sheetId !== executed.sheetId
  ) {
    return toTransform;
  }
  return "SKIP_TRANSFORMATION";
}
