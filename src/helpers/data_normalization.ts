import { defaultValue, sparseDefaultValue } from "../plugins/core/default";
import { Format } from "../types/format";
import { BorderOrNull, CellPosition, Position, Style, UID } from "../types/misc";
import { WorkbookData } from "../types/workbook_data";
import { isObjectFalsyRecursively } from "./misc";
import { recomputeZones } from "./recompute_zones";
import { isZoneInside, positionToZone, toZone, zoneToXc } from "./zones";

type ReverseLookup = Map<string, number>;
export type ItemsDic<T> = { [id: number]: T };

const globalReverseLookup = new WeakMap<ItemsDic<any>, ReverseLookup>();
const globalIdCounter = new WeakMap<ItemsDic<any>, number>();

/**
 * Get the id of the given item (its key in the given dictionary).
 * If the given item does not exist in the dictionary, it creates one with a new id.
 */
export function getItemId<T>(item: T, itemsDic: ItemsDic<T>) {
  if (!globalReverseLookup.has(itemsDic)) {
    globalReverseLookup.set(itemsDic, new Map());
    const maxId = Math.max(...Object.keys(itemsDic).map(Number), 0);
    globalIdCounter.set(itemsDic, maxId);
  }
  const reverseLookup = globalReverseLookup.get(itemsDic)!;
  const canonical = getCanonicalRepresentation(item);
  if (reverseLookup.has(canonical)) {
    const id = reverseLookup.get(canonical)!;
    itemsDic[id] = item;
    return id;
  }

  // Generate new Id if the item didn't exist in the dictionary
  const newId = globalIdCounter.get(itemsDic)! + 1;
  reverseLookup.set(canonical, newId);
  globalIdCounter.set(itemsDic, newId);
  itemsDic[newId] = item;
  return newId;
}

export function groupItemIdsByZones(positionsByItemId: { [id: number]: Position[] }) {
  const result: Record<string, number> = {};
  for (const itemId in positionsByItemId) {
    const zones = recomputeZones(positionsByItemId[itemId].map(positionToZone));
    for (const zone of zones) {
      result[zoneToXc(zone)] = Number(itemId);
    }
  }
  return result;
}

export function* iterateItemIdsPositions(sheetId: UID, itemIdsByZones: Record<string, number>) {
  for (const zoneXc in itemIdsByZones) {
    const zone = toZone(zoneXc);
    const itemId = itemIdsByZones[zoneXc];
    for (let row = zone.top; row <= zone.bottom; row++) {
      for (let col = zone.left; col <= zone.right; col++) {
        const position = { sheetId, col, row };
        yield [position, itemId] as const;
      }
    }
  }
}

export function getCanonicalRepresentation(item: any): string {
  if (item === null) {
    return "null";
  }
  if (item === undefined) {
    return "undefined";
  }
  if (typeof item !== "object") {
    return String(item);
  }

  if (Array.isArray(item)) {
    const len = item.length;
    let result = "[";
    for (let i = 0; i < len; i++) {
      if (i > 0) {
        result += ",";
      }
      result += getCanonicalRepresentation(item[i]);
    }
    return result + "]";
  }

  const keys = Object.keys(item).sort();
  let repr = "{";
  for (const key of keys) {
    if (item[key] !== undefined) {
      repr += `"${key}":${getCanonicalRepresentation(item[key])},`;
    }
  }
  repr += "}";
  return repr;
}

/**
 * This adds a border/style/format to the cell position in the workbook data, updating the zonified structure accordingly.
 */
export function addStyleToWorkbookData(
  workbookData: WorkbookData,
  key: "borders" | "formats" | "styles",
  position: CellPosition,
  newItem: BorderOrNull | Format | Style
) {
  const sheetData = workbookData.sheets.find((sheet) => sheet.id === position.sheetId);
  if (!sheetData) {
    throw new Error(`Sheet with id ${position.sheetId} not found`);
  }

  const id = getItemId(newItem, workbookData[key]);

  const zonifiedData = sheetData[key];
  const zone = positionToZone(position);
  const styleXc = Object.keys(zonifiedData).find((styleXc) => isZoneInside(zone, toZone(styleXc)));

  if (!styleXc) {
    zonifiedData[zoneToXc(zone)] = id;
    return;
  }

  const existingStyle = zonifiedData[styleXc];
  const remainingZones = recomputeZones([toZone(styleXc)], [zone]);
  delete zonifiedData[styleXc];
  for (const remainingZone of remainingZones) {
    zonifiedData[zoneToXc(remainingZone)] = existingStyle;
  }
  zonifiedData[zoneToXc(zone)] = id;
}

export function mapToId<T>(
  defaults: defaultValue<T>,
  dict: ItemsDic<T>
): sparseDefaultValue<number> {
  const defaultsIds: sparseDefaultValue<number> = {
    colDefault: {},
    rowDefault: {},
  };
  if (!isObjectFalsyRecursively(defaults.sheetDefault)) {
    defaultsIds.sheetDefault = getItemId(defaults.sheetDefault, dict);
  }
  for (const colIndex in defaults.colDefault) {
    const colValue = defaults.colDefault[colIndex];
    if (isObjectFalsyRecursively(colValue)) {
      continue;
    }
    defaultsIds.colDefault![colIndex] = getItemId(defaults.colDefault[colIndex], dict);
  }
  for (const rowIndex in defaults.rowDefault) {
    const rowValue = defaults.rowDefault[rowIndex];
    if (isObjectFalsyRecursively(rowValue)) {
      continue;
    }
    defaultsIds.rowDefault![rowIndex] = getItemId(defaults.rowDefault[rowIndex], dict);
  }
  return defaultsIds;
}

export function mapToValue<T>(
  defaultIds: sparseDefaultValue<number>,
  dict: ItemsDic<T>
): defaultValue<T> {
  const defaults: defaultValue<T> = {
    colDefault: [],
    rowDefault: [],
  };
  if (defaultIds.sheetDefault) {
    defaults.sheetDefault = dict[defaultIds.sheetDefault];
  }
  for (const colIndex in defaultIds.colDefault) {
    defaults.colDefault![colIndex] = dict[defaultIds.colDefault[colIndex]];
  }
  for (const rowIndex in defaultIds.rowDefault) {
    defaults.rowDefault![rowIndex] = dict[defaultIds.rowDefault[rowIndex]];
  }
  return defaults;
}
