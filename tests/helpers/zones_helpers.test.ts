import {
  createAdaptedZone,
  expandZoneOnInsertion,
  isZoneValid,
  mergeAlignedColumns,
  mergePositionsIntoColumns,
  overlap,
  positions,
  toCartesian,
  toUnboundedZone,
  toZone,
  zoneToXc,
} from "../../src/helpers/index";
import { Position, Zone } from "../../src/types";
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

describe("mergePositionsIntoColumns", () => {
  function p(xc: string): Position {
    const zone = toZone(xc);
    return { col: zone.left, row: zone.top };
  }
  const A1 = p("A1");
  const A2 = p("A2");
  const A3 = p("A3");
  const B1 = p("B1");
  const B2 = p("B2");
  const C1 = p("C1");
  const C2 = p("C2");
  test("no zone", () => {
    expect(mergePositionsIntoColumns([])).toEqual([]);
  });

  test("a single zone", () => {
    expect(mergePositionsIntoColumns([A1])).toEqual(target("A1"));
  });

  test("a duplicated zone", () => {
    expect(mergePositionsIntoColumns([A1, A1])).toEqual(target("A1"));
  });

  test("two non-adjacent positions on the same column", () => {
    expect(mergePositionsIntoColumns([A1, A3])).toEqual(target("A1, A3"));
  });

  test("two non-adjacent positions on the same row", () => {
    expect(mergePositionsIntoColumns([A1, C1])).toEqual(target("A1, C1"));
  });

  test("two adjacent positions on the same column", () => {
    expect(mergePositionsIntoColumns([A1, A2])).toEqual(target("A1:A2"));
  });

  test("two adjacent positions on the same row", () => {
    expect(mergePositionsIntoColumns([A1, B1])).toEqual(target("A1, B1"));
  });

  test("four adjacent positions on different columns", () => {
    expect(mergePositionsIntoColumns([C2, C1, A1, A2])).toEqual(target("A1:A2, C1:C2"));
  });

  test("four adjacent positions on adjacent columns", () => {
    expect(mergePositionsIntoColumns([C2, C1, B2, B1])).toEqual(target("B1:B2, C1:C2"));
  });
});

describe("mergeAlignedColumns", () => {
  test("no column", () => {
    expect(mergeAlignedColumns([])).toEqual([]);
  });
  test("a row", () => {
    expect(() => mergeAlignedColumns(target("A1:B1"))).toThrow();
    expect(() => mergeAlignedColumns(target("A1:A2, A1:B1"))).toThrow();
  });
  test("a single column", () => {
    expect(mergeAlignedColumns(target("A1:A2"))).toEqual(target("A1:A2"));
  });

  test("two zones on the same column", () => {
    expect(mergeAlignedColumns(target("A1:A2, A3:A4"))).toEqual(target("A1:A2, A3:A4"));
  });

  test("duplicated columns", () => {
    expect(mergeAlignedColumns(target("A1:A2, A1:A2"))).toEqual(target("A1:A2"));
  });

  test("two adjacent zones on the same column", () => {
    expect(mergeAlignedColumns(target("A1:A2, A2:A4"))).toEqual(target("A1:A2, A2:A4"));
  });
  test("two aligned zones on non-adjacent columns", () => {
    expect(mergeAlignedColumns(target("A1:A2, C1:C2"))).toEqual(target("A1:A2, C1:C2"));
  });

  test("two non-aligned zones on adjacent columns", () => {
    expect(mergeAlignedColumns(target("A1:A2, B1:B3"))).toEqual(target("A1:A2, B1:B3"));
  });

  test("two aligned zones on adjacent columns", () => {
    expect(mergeAlignedColumns(target("A1:A2, B1:B2"))).toEqual(target("A1:B2"));
  });

  test("three aligned zones on adjacent columns", () => {
    expect(mergeAlignedColumns(target("A1:A2, B1:B2, C1:C2"))).toEqual(target("A1:C2"));
  });

  test("three aligned zones on adjacent columns", () => {
    expect(mergeAlignedColumns(target("A1:A2, B1:B2, C1:C2"))).toEqual(target("A1:C2"));
  });

  test("two aligned zones on adjacent and one on non-adjacent columns", () => {
    expect(mergeAlignedColumns(target("A1:A2, B1:B2, D1:D2"))).toEqual(target("A1:B2, D1:D2"));
    expect(mergeAlignedColumns(target("A1:A2, D1:D2, B1:B2"))).toEqual(target("A1:B2, D1:D2"));
    expect(mergeAlignedColumns(target("A1:A2, A3:A4, B3:B4"))).toEqual(target("A1:A2, A3:B4"));
    expect(mergeAlignedColumns(target("A3:A4, A1:A2, B3:B4"))).toEqual(target("A1:A2, A3:B4"));
  });
  test("two overlapping columns with one aligned column", () => {
    expect(mergeAlignedColumns(target("A1:A2, A2:A3, B2:B3"))).toEqual(target("A1:A2, A2:B3"));
    expect(mergeAlignedColumns(target("A2:A3, A1:A2, B2:B3"))).toEqual(target("A1:A2, A2:B3"));

    expect(mergeAlignedColumns(target("A1:A2, A2:A3, B1:B2"))).toEqual(target("A1:B2, A2:A3"));
    expect(mergeAlignedColumns(target("A2:A3, A1:A2, B1:B2"))).toEqual(target("A1:B2, A2:A3"));
  });
  test("two overlapping columns with two aligned column", () => {
    expect(mergeAlignedColumns(target("A1:A2, A2:A3, B2:B3, C2:C3"))).toEqual(
      target("A1:A2, A2:C3")
    );
    expect(mergeAlignedColumns(target("B2:B3, C2:C3, A1:A2, A2:A3"))).toEqual(
      target("A1:A2, A2:C3")
    );

    expect(mergeAlignedColumns(target("A1:A2, A2:A3, B1:B2, C1:C2"))).toEqual(
      target("A1:C2, A2:A3")
    );
    expect(mergeAlignedColumns(target("C1:C2, A1:A2, A2:A3, B1:B2"))).toEqual(
      target("A1:C2, A2:A3")
    );
  });
  test("one column inside another with zones on the right", () => {
    expect(mergeAlignedColumns(target("A1:A4, A2:A3"))).toEqual(target("A1:A4"));
    expect(mergeAlignedColumns(target("A1:A4, A2:A3, B1:B4"))).toEqual(target("A1:B4"));
    expect(mergeAlignedColumns(target("A2:A3, A1:A4, B1:B4"))).toEqual(target("A1:B4"));

    expect(mergeAlignedColumns(target("A1:A4, A2:A3, B2:B3"))).toEqual(target("A1:A4, B2:B3"));
    expect(mergeAlignedColumns(target("A2:A3, A1:A4, B2:B3"))).toEqual(target("A1:A4, B2:B3"));

    expect(mergeAlignedColumns(target("A1:A4, A1:A3, B1:B3"))).toEqual(target("A1:A4, B1:B3"));
    expect(mergeAlignedColumns(target("A1:A3, A1:A4, B1:B3"))).toEqual(target("A1:A4, B1:B3"));
  });
  test("one column inside another with zones on the left", () => {
    expect(mergeAlignedColumns(target("B1:B3, B1:B4, A1:A3"))).toEqual(target("A1:A3, B1:B4"));
    expect(mergeAlignedColumns(target("B1:B3, B1:B4, A1:A4"))).toEqual(target("A1:B4"));
  });
  test("two aligned respectively with one other", () => {
    expect(mergeAlignedColumns(target("A1:A2, A3:A4, B1:B2, B3:B4"))).toEqual(
      target("A1:B2, A3:B4")
    );
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

describe("expandZoneOnInsertion", () => {
  test("Add rows before the zone", () => {
    const zone = toZone("B2:C3");
    const expanded = expandZoneOnInsertion(zone, "top", 0, "after", 1);
    expect(zoneToXc(expanded)).toBe("B3:C4");
  });

  test("Add rows right before the zone", () => {
    const zone = toZone("B2:C3");
    const expanded = expandZoneOnInsertion(zone, "top", 1, "before", 1);
    expect(zoneToXc(expanded)).toBe("B2:C4");
  });

  test("Add rows inside the zone", () => {
    const zone = toZone("B2:C3");
    const expanded = expandZoneOnInsertion(zone, "top", 1, "after", 1);
    expect(zoneToXc(expanded)).toBe("B2:C4");
  });

  test("Add rows after the zone", () => {
    const zone = toZone("B2:C3");
    const expanded = expandZoneOnInsertion(zone, "top", 5, "after", 1);
    expect(zoneToXc(expanded)).toBe("B2:C3");
  });

  test("Add rows right after the zone", () => {
    const zone = toZone("B2:C3");
    const expanded = expandZoneOnInsertion(zone, "top", 2, "after", 1);
    expect(zoneToXc(expanded)).toBe("B2:C4");
  });
});
