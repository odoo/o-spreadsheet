import {
  createAdaptedZone,
  excludeTopLeft,
  isZoneValid,
  mergeContiguousZones,
  overlap,
  positions,
  toCartesian,
  toUnboundedZone,
  toZone,
  zoneToXc,
} from "../../src/helpers/index";

import { Zone } from "../../src/types";
import { target } from "../test_helpers/helpers";

describe("overlap", () => {
  test("one zone above the other", () => {
    const z1 = { top: 0, right: 0, bottom: 0, left: 0 };
    const z2 = { top: 3, right: 0, bottom: 5, left: 0 };
    expect(overlap(z1, z2)).toBe(false);
    expect(overlap(z2, z1)).toBe(false);
  });
});

describe("isZoneValid", () => {
  test("single cell zone", () => {
    expect(isZoneValid({ bottom: 1, top: 1, right: 1, left: 1 })).toBe(true);
    expect(isZoneValid({ bottom: 0, top: 0, right: 0, left: 0 })).toBe(true);
  });
  test("multiple cells zone", () => {
    expect(isZoneValid({ bottom: 10, top: 1, right: 10, left: 1 })).toBe(true);
  });
  test("bottom before top", () => {
    expect(isZoneValid({ bottom: 1, top: 2, right: 1, left: 1 })).toBe(false);
  });
  test("right before left", () => {
    expect(isZoneValid({ bottom: 1, top: 1, right: 1, left: 2 })).toBe(false);
  });
  test("negative values", () => {
    expect(isZoneValid({ bottom: -1, top: 1, right: 1, left: 1 })).toBe(false);
    expect(isZoneValid({ bottom: 1, top: -1, right: 1, left: 1 })).toBe(false);
    expect(isZoneValid({ bottom: 1, top: 1, right: -1, left: 1 })).toBe(false);
    expect(isZoneValid({ bottom: 1, top: 1, right: 1, left: -1 })).toBe(false);
  });
});

describe("toZone", () => {
  test.each([["A1"], ["$A1"], ["A$1"], ["$A$1"], ["Sheet1!A1"], ["Sheet1!$A$1"]])(
    "should support different simple cell reference",
    (range) => {
      expect(toZone(range)).toStrictEqual({ top: 0, bottom: 0, left: 0, right: 0 } as Zone);
    }
  );

  test.each([
    ["A1:B2"],
    ["$A1:B2"],
    ["A$1:B2"],
    ["A1:$B2"],
    ["A1:B$2"],
    ["$A$1:$B$2"],
    ["Sheet1!A1:B2"],
    ["Sheet1!$A$1:$B$2"],
  ])("should support different range reference", (range) => {
    expect(toZone(range)).toStrictEqual({ top: 0, bottom: 1, left: 0, right: 1 } as Zone);
  });

  test.each([
    ["A1:A1", {}],
    ["A:  A1", { bottom: undefined }],
    ["   A1:A", { bottom: undefined }],
    ["1   :A1", { right: undefined }],
    ["A1:   1", { right: undefined }],
  ])("should support spaces", (range, change) => {
    const baseZone = { top: 0, bottom: 0, left: 0, right: 0 };
    expect(toUnboundedZone(range)).toMatchObject({ ...baseZone, ...change });
  });

  test("should support lowercase cell reference", () => {
    expect(toZone("c35")).toStrictEqual({ right: 2, top: 34, bottom: 34, left: 2 } as Zone);
  });
});

describe("positions", () => {
  test("single cell zone", () => {
    expect(positions(toZone("A1"))).toContainEqual(toCartesian("A1"));
    expect(positions(toZone("A1"))).toHaveLength(1);
  });

  test("simple zone", () => {
    const zone = toZone("A1:B2");
    expect(positions(zone)).toHaveLength(4);
    expect(positions(zone)).toContainEqual(toCartesian("A1"));
    expect(positions(zone)).toContainEqual(toCartesian("A2"));
    expect(positions(zone)).toContainEqual(toCartesian("B1"));
    expect(positions(zone)).toContainEqual(toCartesian("B2"));
  });

  test("zone with inverted boundaries", () => {
    const zone = { top: 1, bottom: 0, left: 1, right: 0 };
    expect(positions(zone)).toHaveLength(4);
    expect(positions(zone)).toContainEqual(toCartesian("A1"));
    expect(positions(zone)).toContainEqual(toCartesian("A2"));
    expect(positions(zone)).toContainEqual(toCartesian("B1"));
    expect(positions(zone)).toContainEqual(toCartesian("B2"));
  });
});

describe("createAdaptedZone", () => {
  const zone = toZone("B2:C3");

  test("positive move on columns", () => {
    expect(createAdaptedZone(zone, "columns", "MOVE", 2)).toEqual(toZone("D2:E3"));
  });

  test("positive move on rows", () => {
    expect(createAdaptedZone(zone, "rows", "MOVE", 2)).toEqual(toZone("B4:C5"));
  });

  test("positive move on columns and rows", () => {
    expect(createAdaptedZone(zone, "both", "MOVE", [3, 4])).toEqual(toZone("E6:F7"));
  });

  test("negative move on columns", () => {
    expect(createAdaptedZone(zone, "columns", "MOVE", -1)).toEqual(toZone("A2:B3"));
  });

  test("negative move on rows", () => {
    expect(createAdaptedZone(zone, "rows", "MOVE", -1)).toEqual(toZone("B1:C2"));
  });

  test("negative move on columns and rows", () => {
    expect(createAdaptedZone(zone, "both", "MOVE", [-1, -1])).toEqual(toZone("A1:B2"));
  });

  test("positive resize on columns", () => {
    expect(createAdaptedZone(zone, "columns", "RESIZE", 2)).toEqual(toZone("B2:E3"));
  });

  test("positive resize on rows", () => {
    expect(createAdaptedZone(zone, "rows", "RESIZE", 2)).toEqual(toZone("B2:C5"));
  });

  test("positive resize on columns and rows", () => {
    expect(createAdaptedZone(zone, "both", "RESIZE", [3, 4])).toEqual(toZone("B2:F7"));
  });

  test("negative resize on columns", () => {
    expect(createAdaptedZone(zone, "columns", "RESIZE", -1)).toEqual(toZone("B2:B3"));
  });

  test("negative resize on rows", () => {
    expect(createAdaptedZone(zone, "rows", "RESIZE", -1)).toEqual(toZone("B2:C2"));
  });

  test("negative resize on columns and rows", () => {
    expect(createAdaptedZone(zone, "both", "RESIZE", [-1, -1])).toEqual(toZone("B2"));
  });
});

describe("mergeContiguousZones", () => {
  test("mergeContiguousZones: can merge two contiguous zones", () => {
    let zones = mergeContiguousZones(target("A1:A6, B1:B6"));
    expect(zones.map(zoneToXc)).toEqual(["A1:B6"]);

    zones = mergeContiguousZones(target("A1:D1, A2:D2"));
    expect(zones.map(zoneToXc)).toEqual(["A1:D2"]);

    zones = mergeContiguousZones(target("A1:A6, B2"));
    expect(zones.map(zoneToXc)).toEqual(["A1:B6"]);

    zones = mergeContiguousZones(target("C1, A2:F2"));
    expect(zones.map(zoneToXc)).toEqual(["A1:F2"]);

    // Not contiguous
    zones = mergeContiguousZones(target("C1, C3"));
    expect(zones.map(zoneToXc)).toEqual(["C1", "C3"]);
  });

  test("mergeContiguousZones: can merge two overlapping zones", () => {
    let zones = mergeContiguousZones(target("A1:A6, A1:C4"));
    expect(zones.map(zoneToXc)).toEqual(["A1:C6"]);

    zones = mergeContiguousZones(target("A1:C6, A1:B5"));
    expect(zones.map(zoneToXc)).toEqual(["A1:C6"]);
  });

  test("mergeContiguousZones: can merge overlapping and contiguous zones", () => {
    const zones = mergeContiguousZones(target("A1:A6, A1:C4, A7"));
    expect(zones.map(zoneToXc)).toEqual(["A1:C7"]);
  });

  test("Zones diagonally next to each other are not contiguous", () => {
    const zones = mergeContiguousZones(target("A1, B2, C3, A3"));
    expect(zones.map(zoneToXc)).toEqual(["A1", "B2", "C3", "A3"]);
  });
});

describe("excludeTopLeft", () => {
  test("single cell zone", () => {
    expect(excludeTopLeft(toZone("A1"))).toEqual([]);
  });

  test("single column zone", () => {
    expect(excludeTopLeft(toZone("A1:A4"))).toEqual([toZone("A2:A4")]);
  });

  test("single row zone", () => {
    expect(excludeTopLeft(toZone("A1:D1"))).toEqual([toZone("B1:D1")]);
  });

  test("2d zone", () => {
    expect(excludeTopLeft(toZone("A1:D4"))).toEqual([toZone("A2:A4"), toZone("B1:D4")]);
  });
});
