import { DependenciesRTree } from "../../src/plugins/ui_core_views/cell_evaluation/dependencies_r_tree";
import { toBoundedRange } from "../test_helpers/helpers";

describe("DependenciesRTree", () => {
  test("insert and search a single cell", () => {
    const rTree = new DependenciesRTree([
      {
        boundingBox: toBoundedRange("Sheet1", "A1:A3"),
        data: toBoundedRange("Sheet1", "B1"),
      },
    ]);
    expect(Array.from(rTree.search(toBoundedRange("Sheet1", "A2")))).toEqual([
      toBoundedRange("Sheet1", "B1"),
    ]);
  });

  test("group data with identical bounding boxes", () => {
    const rTree = new DependenciesRTree([
      {
        boundingBox: toBoundedRange("Sheet1", "A1:B1"),
        data: toBoundedRange("Sheet1", "C1"),
      },
      {
        boundingBox: toBoundedRange("Sheet1", "A1:B1"),
        data: toBoundedRange("Sheet1", "D1"),
      },
    ]);
    expect(Array.from(rTree.search(toBoundedRange("Sheet1", "A1")))).toEqual([
      toBoundedRange("Sheet1", "C1:D1"),
    ]);
  });

  test("insert with identical existing bounding box", () => {
    const rTree = new DependenciesRTree([
      {
        boundingBox: toBoundedRange("Sheet1", "A1:B1"),
        data: toBoundedRange("Sheet1", "C1"),
      },
    ]);
    rTree.insert({
      boundingBox: toBoundedRange("Sheet1", "A1:B1"),
      data: toBoundedRange("Sheet1", "D1"),
    });
    expect(Array.from(rTree.search(toBoundedRange("Sheet1", "A1")))).toEqual([
      toBoundedRange("Sheet1", "C1:D1"),
    ]);
  });

  test("insert with bounding box inside an existing one", () => {
    const rTree = new DependenciesRTree([
      {
        boundingBox: toBoundedRange("Sheet1", "A1:B1"),
        data: toBoundedRange("Sheet1", "C1"),
      },
    ]);
    rTree.insert({
      boundingBox: toBoundedRange("Sheet1", "B1"),
      data: toBoundedRange("Sheet1", "E1"),
    });
    expect(Array.from(rTree.search(toBoundedRange("Sheet1", "A1")))).toEqual([
      toBoundedRange("Sheet1", "C1"),
    ]);
    expect(Array.from(rTree.search(toBoundedRange("Sheet1", "B1")))).toEqual([
      toBoundedRange("Sheet1", "C1"),
      toBoundedRange("Sheet1", "E1"),
    ]);
  });

  test("remove a full range", () => {
    const item = {
      boundingBox: toBoundedRange("Sheet1", "A1:B1"),
      data: toBoundedRange("Sheet1", "C1"),
    };
    const rTree = new DependenciesRTree([item]);
    rTree.remove(item);
    expect(Array.from(rTree.search(toBoundedRange("Sheet1", "A1")))).toEqual([]);
  });

  test("remove part of a range", () => {
    const rTree = new DependenciesRTree([
      {
        boundingBox: toBoundedRange("Sheet1", "A1:B1"),
        data: toBoundedRange("Sheet1", "C1:C3"),
      },
    ]);
    rTree.remove({
      boundingBox: toBoundedRange("Sheet1", "A1:B1"),
      data: toBoundedRange("Sheet1", "C2"), // remove only C2
    });
    expect(Array.from(rTree.search(toBoundedRange("Sheet1", "A1")))).toEqual([
      toBoundedRange("Sheet1", "C1"),
      toBoundedRange("Sheet1", "C3"),
    ]);
  });
});
