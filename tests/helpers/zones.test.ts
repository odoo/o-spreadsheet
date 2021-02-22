import { overlap, recomputeZones, toZone } from "../../src/helpers/index";
import { Zone } from "../../src/types";

describe("overlap", () => {
  test("one zone above the other", () => {
    const z1 = { top: 0, right: 0, bottom: 0, left: 0 };
    const z2 = { top: 3, right: 0, bottom: 5, left: 0 };
    expect(overlap(z1, z2)).toBe(false);
    expect(overlap(z2, z1)).toBe(false);
  });
});

describe("recomputeZones", () => {
  test("add a cell to zone(1)", () => {
    const toKeep = ["A1:C3", "A4"];
    const expectedZone = ["A1:A4", "B1:C3"];
    expect(recomputeZones(toKeep, [])).toEqual(expectedZone);
  });

  test("add a cell to zone(2)", () => {
    const toKeep = ["A1:C3", "D1"];
    const expectedZone = ["A1:C3", "D1"];
    expect(recomputeZones(toKeep, [])).toEqual(expectedZone);
  });

  test("add a row to a zone", () => {
    const toKeep = ["A1:C3", "A4:C4"];
    const expectedZone = ["A1:C4"];
    expect(recomputeZones(toKeep, [])).toEqual(expectedZone);
  });

  test("add a col to a zone", () => {
    const toKeep = ["A1:C3", "D1:D3"];
    const expectedZone = ["A1:D3"];
    expect(recomputeZones(toKeep, [])).toEqual(expectedZone);
  });
  test("merge zones", () => {
    const toKeep = ["A1:B3", "B2:C5", "C1:C5"];
    const expectedZone = ["A1:A3", "B1:C5"];
    expect(recomputeZones(toKeep, [])).toEqual(expectedZone);
  });
  test("zones included", () => {
    const toKeep = ["A1:D6", "A2:C3"];
    const expectedZone = ["A1:D6"];
    expect(recomputeZones(toKeep, [])).toEqual(expectedZone);
  });
  test("remove a cell (1)", () => {
    const toKeep = ["A1:D6"];
    const toRemove = ["A1"];
    const expectedZone = ["A2:A6", "B1:D6"];
    expect(recomputeZones(toKeep, toRemove)).toEqual(expectedZone);
  });
  test("remove a cell (2)", () => {
    const toKeep = ["A1:D6"];
    const toRemove = ["D6"];
    const expectedZone = ["A1:C6", "D1:D5"];
    expect(recomputeZones(toKeep, toRemove)).toEqual(expectedZone);
  });
  test("remove a cell (3)", () => {
    const toKeep = ["A1:D6"];
    const toRemove = ["B3"];
    const expectedZone = ["A1:A6", "B1:B2", "B4:B6", "C1:D6"];
    expect(recomputeZones(toKeep, toRemove)).toEqual(expectedZone);
  });
  test("remove a zone", () => {
    const toKeep = ["A1:D6"];
    const toRemove = ["B1:C6"];
    const expectedZone = ["A1:A6", "D1:D6"];
    expect(recomputeZones(toKeep, toRemove)).toEqual(expectedZone);
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

  test("should support lowercase cell reference", () => {
    expect(toZone("c35")).toStrictEqual({ right: 2, top: 34, bottom: 34, left: 2 } as Zone);
  });
});
