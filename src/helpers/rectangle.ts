import { Rect, Zone } from "../types";
import { intersection, union } from "./zones";

/**
 * Compute the intersection of two rectangles. Returns nothing if the two rectangles don't overlap
 */
export function rectIntersection(rect1: Rect, rect2: Rect): Rect | undefined {
  return zoneToRect(intersection(rectToZone(rect1), rectToZone(rect2)));
}

/** Compute the union of the rectangles, ie. the smallest rectangle that contain them all */
export function rectUnion(...rects: Rect[]): Rect {
  return zoneToRect(union(...rects.map(rectToZone)))!;
}

function rectToZone(rect: Rect): Zone {
  return {
    left: rect.x,
    top: rect.y,
    right: rect.x + rect.width,
    bottom: rect.y + rect.height,
  };
}

function zoneToRect(zone: Zone | undefined): Rect | undefined {
  if (!zone) return undefined;
  return {
    x: zone.left,
    y: zone.top,
    width: zone.right - zone.left,
    height: zone.bottom - zone.top,
  };
}
