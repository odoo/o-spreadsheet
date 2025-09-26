import { createRangeFromXc, splitReference } from "../../src/helpers";
import { RangeSet } from "../../src/plugins/ui_core_views/cell_evaluation/range_set";

function toRange(rangeStr: string) {
  const { sheetName, xc } = splitReference(rangeStr);
  if (!sheetName) {
    throw new Error("Range string must contain a sheet name");
  }
  const fullRange = createRangeFromXc({ xc, sheetId: sheetName }, () => ({
    numberOfRows: Number.MAX_SAFE_INTEGER,
    numberOfCols: Number.MAX_SAFE_INTEGER,
  }));
  return {
    sheetId: fullRange.sheetId,
    zone: fullRange.zone,
    unboundedZone: fullRange.zone,
  };
}

describe("RangeSet", () => {
  test("empty RangeSet has nothing", () => {
    const set = new RangeSet();
    expect(set.has(toRange("Sheet1!A1"))).toBe(false);
    expect(Array.from(set)).toEqual([]);
  });

  test("ranges from different sheets are not mixed", () => {
    const set = new RangeSet();
    set.add(toRange("Sheet1!A1"));
    set.add(toRange("Sheet2!A1"));
    expect(Array.from(set)).toMatchObject([toRange("Sheet1!A1"), toRange("Sheet2!A1")]);
  });

  test("removing from a sheet doesn't affect other sheets", () => {
    const set = new RangeSet();
    set.add(toRange("Sheet1!A1"));
    set.add(toRange("Sheet2!A1"));
    set.delete(toRange("Sheet1!A1"));
    expect(Array.from(set)).toMatchObject([toRange("Sheet2!A1")]);
  });

  test("difference between RangeSets", () => {
    const set1 = new RangeSet([toRange("Sheet1!A1:A3"), toRange("Sheet2!A1:B3")]);
    const set2 = new RangeSet([toRange("Sheet1!A2"), toRange("Sheet2!B2"), toRange("Sheet2!B3")]);
    const diff = set1.difference(set2);
    expect(Array.from(diff)).toMatchObject([
      toRange("Sheet1!A1"),
      toRange("Sheet1!A3"),
      toRange("Sheet2!A1:A3"),
      toRange("Sheet2!B1"),
    ]);
  });
});
