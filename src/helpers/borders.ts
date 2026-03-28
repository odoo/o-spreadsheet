import { UID, WorkbookData, Zone } from "..";
import { ZoneBorderData } from "../plugins/core";
import { getItemId } from "./data_normalization";
import { deepEquals, removeFalsyAttributes } from "./misc";
import { recomputeZones } from "./recompute_zones";
import { toZone, zoneToXc } from "./zones";

function isVerticallyMeargeable(border: ZoneBorderData, zone: Zone): boolean {
  return zone.top === zone.bottom
    ? (!border.bottom && !!border.top) || deepEquals(border.top, border.bottom)
    : deepEquals(border.top, border.bottom, border.horizontal);
}

function getVerticallyMergedBorder(border: ZoneBorderData): ZoneBorderData {
  return removeFalsyAttributes({
    left: border.left,
    right: border.right,
    vertical: border.vertical,
    top: border.top,
    bottom: border.bottom,
    horizontal: border.top,
  });
}

export function mergeBorders(data: WorkbookData) {
  if (!Object.keys(data.borders || {}).length) {
    return;
  }
  for (const sheet of data.sheets) {
    const borderType: Record<UID, Record<string, Zone[]>> = {};
    const borders = {};
    for (const zoneXc in sheet.borders) {
      const borderId = sheet.borders[zoneXc];
      if (!borderId) {
        continue;
      }
      const zone = toZone(zoneXc);
      if (!isVerticallyMeargeable(data.borders[borderId], zone)) {
        borders[zoneXc] = borderId;
        continue;
      }
      borderType[borderId] ??= {};
      const lr = `${zone.left}:${zone.right}`;
      borderType[borderId][lr] ??= [];
      borderType[borderId][lr].push(zone);
    }
    for (const borderId in borderType) {
      for (const lr in borderType[borderId]) {
        const zones = borderType[borderId][lr];
        let newBorderId: string | number = borderId;
        if (zones.length > 1) {
          newBorderId = getItemId(getVerticallyMergedBorder(data.borders[borderId]), data.borders);
        }
        for (const zone of recomputeZones(zones)) {
          borders[zoneToXc(zone)] = newBorderId;
        }
      }
    }
    sheet.borders = borders;
  }
  return;
}
