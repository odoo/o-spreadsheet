import { groupConsecutive, range } from "../../src/helpers/misc";

describe("Misc", () => {
  test("range", () => {
    expect(range(0, 1)).toEqual([0]);
    expect(range(0, 0)).toEqual([]);
    expect(range(1, 1)).toEqual([]);
    expect(range(10, 1)).toEqual([]);
    expect(range(10, 13)).toEqual([10, 11, 12]);
    expect(range(-2, 2)).toEqual([-2, -1, 0, 1]);
    expect(range(2, -2, -1)).toEqual([2, 1, 0, -1]);
    expect(range(-2, 3, 2)).toEqual([-2, 0, 2]);
    expect(range(-2, 4, 2)).toEqual([-2, 0, 2]);
    expect(range(-2, 5, 2)).toEqual([-2, 0, 2, 4]);
    expect(range(2, -3, -2)).toEqual([2, 0, -2]);
    expect(range(2, -4, -2)).toEqual([2, 0, -2]);
    expect(range(2, -5, -2)).toEqual([2, 0, -2, -4]);
    expect(range(10, 0, 1)).toEqual([]);
    expect(() => range(0, 10, 0)).toThrow();
  });

  test("groupConsecutive", () => {
    expect(groupConsecutive([])).toEqual([]);
    expect(groupConsecutive([1, 2])).toEqual([[1, 2]]);
    expect(groupConsecutive([2, 2])).toEqual([[2], [2]]);
    expect(groupConsecutive([1, 2, 4])).toEqual([[1, 2], [4]]);
    expect(groupConsecutive([-1, 0, 4])).toEqual([[-1, 0], [4]]);
    expect(groupConsecutive([4, 2, 1])).toEqual([[4], [2, 1]]);
  });
});
