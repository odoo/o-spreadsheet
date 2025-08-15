import { PositionMap } from "../../src/plugins/ui_core_views/cell_evaluation/position_map";

describe("PositionMap", () => {
  test("set an element", () => {
    const map = new PositionMap<number>();
    const A1 = { sheetId: "1", row: 0, col: 0 };
    map.set(A1, 1);
    expect(map.get(A1)).toBe(1);
    expect(map.has(A1)).toBe(true);
  });

  test("remove an element", () => {
    const map = new PositionMap<number>();
    const A1 = { sheetId: "1", row: 0, col: 0 };
    map.set(A1, 1);
    map.delete(A1);
    expect(map.get(A1)).toBeUndefined();
    expect(map.has(A1)).toBe(false);
  });

  test("empty map has no element", () => {
    const map = new PositionMap<number>();
    expect(map.has({ sheetId: "1", row: 0, col: 0 })).toBe(false);
  });

  test("iterate over empty map keys", () => {
    const map = new PositionMap<number>();
    expect([...map.keys()]).toEqual([]);
  });

  test("iterate over keys", () => {
    const map = new PositionMap<number>();
    const A1 = { sheetId: "1", row: 0, col: 0 };
    const A2 = { sheetId: "1", row: 0, col: 1 };
    map.set(A1, 1);
    map.set(A2, 2);
    expect([...map.keys()]).toEqual([A1, A2]);
  });
});
