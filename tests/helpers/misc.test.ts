import { DateTime, deepCopy, deepEquals } from "../../src/helpers";
import { groupConsecutive, lazy, range } from "../../src/helpers/misc";

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

describe("deepCopy", () => {
  test.each([
    {},
    [],
    [{}],
    [1, 2],
    ["1", "2"],
    [undefined],
    [null],
    { a: 1 },
    { a: undefined },
    { a: null },
    { a: {} },
    { a: [] },
    { a: { b: {} } },
    { a: { b: [] } },
    { a: { b: 1 } },
    { a: { b: "1" } },
    [{ a: 1 }],
    [, , "a"],
    () => 4,
    1,
    "1",
    true,
    false,
    undefined,
    null,
  ])("deepCopy %s", (obj) => {
    expect(deepCopy(obj)).toEqual(obj);
  });

  test.each([new Set(), new Map(), new Set([1]), new Date(), new DateTime(2023, 10, 30)])(
    "unsupported type %s throws an error",
    (obj) => {
      expect(() => deepCopy(obj)).toThrow();
    }
  );

  test("object is not mutated", () => {
    const obj = { a: 1 };
    const copy = deepCopy(obj);
    copy["a"] = 2;
    copy["b"] = 2;
    expect(obj["a"]).toBe(1);
    expect("b" in obj).toBe(false);
  });

  test("nested objects is not mutated", () => {
    const obj = { z: { a: 1 } };
    const copy = deepCopy(obj);
    copy["z"]["a"] = 2;
    copy["z"]["b"] = 2;
    expect(obj["z"]["a"]).toBe(1);
    expect("b" in obj["z"]).toBe(false);
  });

  test("nested nested objects is not mutated", () => {
    const obj = { y: { z: { a: 1 } } };
    const copy = deepCopy(obj);
    copy["y"]["z"]["a"] = 2;
    copy["y"]["z"]["b"] = 2;
    expect(obj["y"]["z"]["a"]).toBe(1);
    expect("b" in obj["y"]["z"]).toBe(false);
  });

  test("array is not mutated", () => {
    const arr = [1];
    const copy = deepCopy(arr);
    copy.push(2);
    expect(arr).toEqual([1]);
  });

  test("nested array is not mutated", () => {
    const arr = [[1]];
    const copy = deepCopy(arr);
    copy[0].push(2);
    expect(arr[0]).toEqual([1]);
  });

  test("nested nested array is not mutated", () => {
    const arr = [[[1]]];
    const copy = deepCopy(arr);
    copy[0][0].push(2);
    expect(arr[0][0]).toEqual([1]);
  });

  test("preserves sparse arrays", () => {
    const copy = deepCopy([, , "a"]);
    expect("0" in copy).toBe(false);
    expect("1" in copy).toBe(false);
    expect("2" in copy).toBe(true);
  });
});

describe("lazy", () => {
  test("simple lazy value", () => {
    const lazyValue = lazy(() => 5);
    expect(lazyValue()).toBe(5);
  });

  test("map a lazy value", () => {
    const lazyValue = lazy(() => 5).map((v) => v + 1);
    expect(lazyValue()).toBe(6);
  });

  test("multiple lazy map", () => {
    const lazyValue = lazy(() => 5)
      .map((v) => v + 1)
      .map((v) => v + 1);
    expect(lazyValue()).toBe(7);
  });

  test("map does not evaluates original lazy value", () => {
    let count = 0;
    const lazyValue = lazy(() => ++count).map((v) => v + 1);
    expect(count).toBe(0);
    expect(lazyValue()).toBe(2);
    expect(count).toBe(1);
  });

  test("mapped value and original value are independent", () => {
    const lazyValue = lazy(() => 5);
    const mappedValue = lazyValue.map((v) => v + 1);
    expect(lazyValue()).toBe(5);
    expect(mappedValue()).toBe(6);
  });

  test("value is memoized", () => {
    let count = 0;
    const lazyValue = lazy(() => ++count);
    expect(lazyValue()).toBe(1);
    expect(lazyValue()).toBe(1);
    expect(count).toBe(1);
  });

  test("mapped value is memoized", () => {
    let count = 0;
    let countMap = 0;
    const lazyValue = lazy(() => ++count).map((v) => v + ++countMap);
    expect(lazyValue()).toBe(2);
    expect(lazyValue()).toBe(2);
    expect(count).toBe(1);
    expect(countMap).toBe(1);
  });

  test("lazy undefined is memoized", () => {
    let count = 0;
    const lazyValue = lazy(() => {
      ++count;
      return undefined;
    });
    expect(lazyValue()).toBe(undefined);
    expect(lazyValue()).toBe(undefined);
    expect(count).toBe(1);
  });

  test("lazy with non computed values", () => {
    expect(lazy(5)()).toBe(5);
    expect(lazy(true)()).toBe(true);
    expect(lazy("a string")()).toBe("a string");
    const obj = { a: 5 };
    expect(lazy(obj)()).toBe(obj);
  });

  test("map a non-computed lazy value to another value", () => {
    expect(lazy(5).map((n) => n + 1)()).toBe(6);
  });
});

test.each([
  [1, 1, true],
  [1, 5, false],
  [1, Number(1), true],
  ["ok", "ok", true],
  ["ok", "ko", false],
  [5, "5", false],
  [true, true, true],
  [true, false, false],
  [{}, {}, true],
  [{ a: 1 }, { a: 1 }, true],
  [{ a: 1 }, { a: 2 }, false],
  [{ a: undefined }, {}, true],
  [{ a: undefined }, { a: null }, false],
  [{ a: null }, {}, false],
  [{ a: 1, b: undefined }, { a: 1 }, true],
  [undefined, undefined, true],
])("deepEquals %s %s", (o1: any, o2: any, expectedResult) => {
  expect(deepEquals(o1, o2)).toEqual(expectedResult);
});
