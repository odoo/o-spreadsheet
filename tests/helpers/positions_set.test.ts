import { PositionSet } from "../../src/plugins/ui_core_views/cell_evaluation/position_set";

describe("PositionSet", () => {
  test("add and delete position in the edge corners", () => {
    for (const cols of [1, 2, 5, 31, 32, 33]) {
      for (const rows of [1, 2, 5, 31, 32, 33]) {
        const set = new PositionSet({ "1": { rows: rows, cols: cols } });
        const upperLeft = { sheetId: "1", row: 0, col: 0 };
        const upperRight = { sheetId: "1", row: 0, col: cols - 1 };
        const lowerLeft = { sheetId: "1", row: rows - 1, col: 0 };
        const lowerRight = { sheetId: "1", row: rows - 1, col: cols - 1 };
        set.add(upperLeft);
        set.add(upperRight);
        set.add(lowerLeft);
        set.add(lowerRight);
        expect(set.has(upperLeft)).toBe(true);
        expect(set.has(upperRight)).toBe(true);
        expect(set.has(lowerLeft)).toBe(true);
        expect(set.has(lowerRight)).toBe(true);
        expect(set.isEmpty()).toBe(false);
        set.delete(upperLeft);
        set.delete(upperRight);
        set.delete(lowerLeft);
        set.delete(lowerRight);
        expect(set.has(upperLeft)).toBe(false);
        expect(set.has(upperRight)).toBe(false);
        expect(set.has(lowerLeft)).toBe(false);
        expect(set.has(lowerRight)).toBe(false);
        expect(set.isEmpty()).toBe(true);
      }
    }
  });

  test("add same position twice", () => {
    const set = new PositionSet({ "1": { rows: 10, cols: 10 } });
    set.add({ sheetId: "1", row: 1, col: 1 });
    set.add({ sheetId: "1", row: 1, col: 1 });
    expect(set.has({ sheetId: "1", row: 1, col: 1 })).toBe(true);
  });

  test("add/delete two positions in batch", () => {
    const set = new PositionSet({ "1": { rows: 10, cols: 10 } });
    const A1 = { sheetId: "1", row: 0, col: 0 };
    const A2 = { sheetId: "1", row: 0, col: 1 };
    set.addMany([A1, A2]);
    expect([...set]).toEqual([A1, A2]);
    set.deleteMany([A1, A2]);
    expect([...set]).toEqual([]);
    expect(set.isEmpty()).toBe(true);
  });

  test("add the same position twice in batch", () => {
    const set = new PositionSet({ "1": { rows: 10, cols: 10 } });
    const A1 = { sheetId: "1", row: 0, col: 0 };
    set.addMany([A1, A1]);
    expect([...set]).toEqual([A1]);
  });

  test("has with position which has never been inserted", () => {
    const set = new PositionSet({ "1": { rows: 10, cols: 10 } });
    expect(set.has({ sheetId: "1", row: 1, col: 1 })).toBe(false);
  });

  test("clear a set with elements", () => {
    const set = new PositionSet({ "1": { rows: 10, cols: 10 } });
    const A1 = { sheetId: "1", row: 0, col: 0 };
    set.add(A1);
    expect(set.clear()).toEqual([A1]);
    expect(set.isEmpty()).toBe(true);
    expect(set.has(A1)).toBe(false);
  });

  test("iterate on empty set", () => {
    const set = new PositionSet({ "1": { rows: 10, cols: 10 } });
    expect([...set]).toEqual([]);
  });

  test("iterate on a set with multiple elements", () => {
    const set = new PositionSet({ "1": { rows: 10, cols: 10 } });
    const A1 = { sheetId: "1", row: 0, col: 0 };
    const A2 = { sheetId: "1", row: 0, col: 1 };
    set.add(A1);
    expect([...set]).toEqual([A1]);
    set.add(A2);
    expect([...set]).toEqual([A1, A2]);
  });

  test("iterate only once on element inserted twice", () => {
    const set = new PositionSet({ "1": { rows: 10, cols: 10 } });
    const A1 = { sheetId: "1", row: 0, col: 0 };
    set.add(A1);
    set.add(A1);
    expect([...set]).toEqual([A1]);
  });

  test("do not iterate on removed elements", () => {
    const set = new PositionSet({ "1": { rows: 10, cols: 10 } });
    const A1 = { sheetId: "1", row: 0, col: 0 };
    set.add(A1);
    set.delete(A1);
    expect([...set]).toEqual([]);
  });

  test.skip("iterate element added, removed, then added again", () => {
    const set = new PositionSet({ "1": { rows: 10, cols: 10 } });
    const A1 = { sheetId: "1", row: 0, col: 0 };
    set.add(A1);
    set.delete(A1);
    set.add(A1);
    // this test shows an implementation limitation, that the same position
    // may be yielded multiple times
    expect([...set]).toEqual([A1, A1]);
  });

  test.skip("insertion order is preserved when iterating", () => {
    const set1 = new PositionSet({ "1": { rows: 10, cols: 10 } });
    const set2 = new PositionSet({ "1": { rows: 10, cols: 10 } });
    const A1 = { sheetId: "1", row: 0, col: 0 };
    const A2 = { sheetId: "1", row: 0, col: 1 };
    set1.add(A1);
    set1.add(A2);
    // insert in reverse order
    set2.add(A2);
    set2.add(A1);
    expect([...set1]).toEqual([A1, A2]);
    expect([...set2]).toEqual([A2, A1]);
  });

  test("fill all positions", () => {
    const set = new PositionSet({ "1": { rows: 2, cols: 2 } });
    const A1 = { sheetId: "1", row: 0, col: 0 };
    const A2 = { sheetId: "1", row: 0, col: 1 };
    const B1 = { sheetId: "1", row: 1, col: 0 };
    const B2 = { sheetId: "1", row: 1, col: 1 };
    set.fillAllPositions();
    expect([...set]).toEqual([A1, A2, B1, B2]);
    expect(set.has(A1)).toBe(true);
    expect(set.has(A2)).toBe(true);
    expect(set.has(B1)).toBe(true);
    expect(set.has(B2)).toBe(true);
  });
});
