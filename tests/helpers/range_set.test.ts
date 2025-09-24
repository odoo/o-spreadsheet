import { RangeSet } from "@odoo/o-spreadsheet-engine/plugins/ui_core_views/cell_evaluation/range_set";
import { toBoundedRange } from "../test_helpers/helpers";

describe("RangeSet", () => {
  test("empty RangeSet has nothing", () => {
    const set = new RangeSet();
    expect(set.has(toBoundedRange("Sheet1", "A1"))).toBe(false);
    expect(Array.from(set)).toEqual([]);
  });

  test("ranges from different sheets are not mixed", () => {
    const set = new RangeSet();
    set.add(toBoundedRange("Sheet1", "A1"));
    set.add(toBoundedRange("Sheet2", "A1"));
    expect(Array.from(set)).toMatchObject([
      toBoundedRange("Sheet1", "A1"),
      toBoundedRange("Sheet2", "A1"),
    ]);
  });

  test("removing from a sheet doesn't affect other sheets", () => {
    const set = new RangeSet();
    set.add(toBoundedRange("Sheet1", "A1"));
    set.add(toBoundedRange("Sheet2", "A1"));
    set.delete(toBoundedRange("Sheet1", "A1"));
    expect(Array.from(set)).toMatchObject([toBoundedRange("Sheet2", "A1")]);
  });

  test("difference between RangeSets", () => {
    const set1 = new RangeSet([
      toBoundedRange("Sheet1", "A1:A3"),
      toBoundedRange("Sheet2", "A1:B3"),
    ]);
    const set2 = new RangeSet([
      toBoundedRange("Sheet1", "A2"),
      toBoundedRange("Sheet2", "B2"),
      toBoundedRange("Sheet2", "B3"),
    ]);
    const diff = set1.difference(set2);
    expect(Array.from(diff)).toMatchObject([
      toBoundedRange("Sheet1", "A1"),
      toBoundedRange("Sheet1", "A3"),
      toBoundedRange("Sheet2", "A1:A3"),
      toBoundedRange("Sheet2", "B1"),
    ]);
  });
});
