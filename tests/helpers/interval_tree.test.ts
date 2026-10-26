import { Dimension } from "../../src";
import { Interval, IntervalTree } from "../../src/plugins/evaluation/cell_evaluation/interval_tree";
import { toBoundedRange } from "../test_helpers/helpers";

describe.each(["COL", "ROW"])("IntervalTree", (dim: Dimension) => {
  // Helper to create a Required<Interval> quickly
  const createInterval = (
    top: number,
    bottom: number,
    dependents: Required<Interval>["dependents"]
  ): Required<Interval> => ({
    start: top,
    end: bottom,
    dim,
    dependents,
  });

  test("should merge two contiguous cell ranges with the same interval", () => {
    const tree = new IntervalTree();
    // Row 1 to 5 and Row 6 to 10 are contiguous in Column A
    if (dim === "COL") {
      tree.insert(createInterval(100, 200, toBoundedRange("Sheet1", "A1:A5")));
      tree.insert(createInterval(100, 200, toBoundedRange("Sheet1", "A6:A10")));
    } else {
      tree.insert(createInterval(100, 200, toBoundedRange("Sheet1", "A1:D1")));
      tree.insert(createInterval(100, 200, toBoundedRange("Sheet1", "E1:I1")));
    }

    const results = tree.query({ start: 150, end: 160 });
    expect(results).toHaveLength(1);
    if (dim === "COL") {
      expect(results[0]).toEqual(createInterval(100, 200, toBoundedRange("Sheet1", "A1:A10")));
    } else {
      expect(results[0]).toEqual(createInterval(100, 200, toBoundedRange("Sheet1", "A1:I1")));
    }
  });

  test("should NOT merge two contiguous cell ranges with different intervals", () => {
    const tree = new IntervalTree();
    // Row 1 to 5 and Row 6 to 10 are contiguous in Column A
    tree.insert(createInterval(100, 200, toBoundedRange("Sheet1", "A1:A5")));
    tree.insert(createInterval(101, 201, toBoundedRange("Sheet1", "A6:A10")));
    const results = tree.query({ start: 150, end: 160 });
    expect(results).toHaveLength(2);
    expect(results).toContainEqual(createInterval(100, 200, toBoundedRange("Sheet1", "A1:A5")));
    expect(results).toContainEqual(createInterval(101, 201, toBoundedRange("Sheet1", "A6:A10")));
  });

  test("should NOT merge two contiguous cell ranges on different sheets", () => {
    const tree = new IntervalTree();
    tree.insert(createInterval(100, 200, toBoundedRange("Sheet1", "A1:A5")));
    tree.insert(createInterval(100, 200, toBoundedRange("Sheet2", "A6:A10")));
    const results = tree.query({ start: 150, end: 160 });
    expect(results).toHaveLength(2);
    expect(results).toContainEqual(createInterval(100, 200, toBoundedRange("Sheet1", "A1:A5")));
    expect(results).toContainEqual(createInterval(100, 200, toBoundedRange("Sheet2", "A6:A10")));
  });

  test("should NOT merge ranges in different columns", () => {
    const tree = new IntervalTree();
    // A1:A5 and B6:B10 are vertically contiguous but horizontally distinct
    tree.insert(createInterval(10, 20, toBoundedRange("Sheet1", "A1:A5")));
    tree.insert(createInterval(10, 20, toBoundedRange("Sheet1", "B6:B10")));

    const results = tree.query({ start: 15, end: 16 });
    expect(results).toHaveLength(2);
    expect(results).toContainEqual(createInterval(10, 20, toBoundedRange("Sheet1", "A1:A5")));
    expect(results).toContainEqual(createInterval(10, 20, toBoundedRange("Sheet1", "B6:B10")));
  });

  test("should NOT merge ranges that overlap but aren't strictly contiguous by 1 unit", () => {
    const tree = new IntervalTree();
    // A1:A5 and A5:A10 (overlap at row 5)
    // Compaction expects next.top = current.bottom + 1
    tree.insert(createInterval(50, 60, toBoundedRange("Sheet1", "A1:A5")));
    tree.insert(createInterval(50, 60, toBoundedRange("Sheet1", "A5:A10")));

    const results = tree.query({ start: 55, end: 56 });
    expect(results).toHaveLength(2);
    expect(results).toContainEqual(createInterval(50, 60, toBoundedRange("Sheet1", "A1:A5")));
    expect(results).toContainEqual(createInterval(50, 60, toBoundedRange("Sheet1", "A5:A10")));
  });

  test("insert the same interval twice", () => {
    const tree = new IntervalTree();
    tree.insert(createInterval(100, 200, toBoundedRange("Sheet1", "A1:A5")));
    tree.insert(createInterval(100, 200, toBoundedRange("Sheet1", "A1:A5")));

    const results = tree.query({ start: 150, end: 160 });
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(createInterval(100, 200, toBoundedRange("Sheet1", "A1:A5")));
  });

  test("query outside any interval", () => {
    const tree = new IntervalTree();
    tree.insert(createInterval(10, 20, toBoundedRange("Sheet1", "A1")));
    tree.insert(createInterval(100, 110, toBoundedRange("Sheet1", "A10")));

    expect(tree.query({ start: 1, end: 9 })).toHaveLength(0);
    expect(tree.query({ start: 21, end: 99 })).toHaveLength(0);
    expect(tree.query({ start: 111, end: 120 })).toHaveLength(0);
  });

  test("query on interval boundaries", () => {
    const interval = createInterval(10, 20, toBoundedRange("Sheet1", "A1"));
    const tree = new IntervalTree();
    tree.insert(interval);

    expect(tree.query({ start: 10, end: 10 })).toEqual([interval]);
    expect(tree.query({ start: 20, end: 20 })).toEqual([interval]);
    expect(tree.query({ start: 1, end: 10 })).toEqual([interval]);
    expect(tree.query({ start: 20, end: 30 })).toEqual([interval]);
  });
});
