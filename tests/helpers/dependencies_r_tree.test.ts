import { DependenciesRTree } from "../../src/plugins/ui_core_views/cell_evaluation/dependencies_r_tree";
import { RangeSet } from "../../src/plugins/ui_core_views/cell_evaluation/range_set";
import { toRange } from "../test_helpers/helpers";

describe("DependenciesRTree", () => {
  test("insert and search a single cell", () => {
    const rTree = new DependenciesRTree([
      {
        boundingBox: toRange("Sheet1", "A1:A3"),
        data: toRange("Sheet1", "B1"),
      },
    ]);
    expect(rTree.search(toRange("Sheet1", "A2"))).toEqual(new RangeSet([toRange("Sheet1", "B1")]));
  });

  test("group data with identical bounding boxes", () => {
    const rTree = new DependenciesRTree([
      {
        boundingBox: toRange("Sheet1", "A1:B1"),
        data: toRange("Sheet1", "C1"),
      },
      {
        boundingBox: toRange("Sheet1", "A1:B1"),
        data: toRange("Sheet1", "D1"),
      },
    ]);
    expect(rTree.search(toRange("Sheet1", "A1"))).toEqual(
      new RangeSet([toRange("Sheet1", "C1:D1")])
    );
  });

  test("insert with identical existing bounding box", () => {
    const rTree = new DependenciesRTree([
      {
        boundingBox: toRange("Sheet1", "A1:B1"),
        data: toRange("Sheet1", "C1"),
      },
    ]);
    rTree.insert({
      boundingBox: toRange("Sheet1", "A1:B1"),
      data: toRange("Sheet1", "D1"),
    });
    expect(rTree.search(toRange("Sheet1", "A1"))).toEqual(
      new RangeSet([toRange("Sheet1", "C1:D1")])
    );
  });

  test("insert with bounding box inside an existing one", () => {
    const rTree = new DependenciesRTree([
      {
        boundingBox: toRange("Sheet1", "A1:B1"),
        data: toRange("Sheet1", "C1"),
      },
    ]);
    rTree.insert({
      boundingBox: toRange("Sheet1", "B1"),
      data: toRange("Sheet1", "E1"),
    });
    expect(rTree.search(toRange("Sheet1", "A1"))).toEqual(new RangeSet([toRange("Sheet1", "C1")]));
    expect(rTree.search(toRange("Sheet1", "B1"))).toEqual(
      new RangeSet([toRange("Sheet1", "C1"), toRange("Sheet1", "E1")])
    );
  });

  test("remove a full range", () => {
    const item = {
      boundingBox: toRange("Sheet1", "A1:B1"),
      data: toRange("Sheet1", "C1"),
    };
    const rTree = new DependenciesRTree([item]);
    rTree.remove(item);
    expect(rTree.search(toRange("Sheet1", "A1"))).toEqual(new RangeSet([]));
  });

  test("remove part of a range", () => {
    const rTree = new DependenciesRTree([
      {
        boundingBox: toRange("Sheet1", "A1:B1"),
        data: toRange("Sheet1", "C1:C3"),
      },
    ]);
    rTree.remove({
      boundingBox: toRange("Sheet1", "A1:B1"),
      data: toRange("Sheet1", "C2"), // remove only C2
    });
    expect(rTree.search(toRange("Sheet1", "A1"))).toEqual(
      new RangeSet([toRange("Sheet1", "C1"), toRange("Sheet1", "C3")])
    );
  });
});
