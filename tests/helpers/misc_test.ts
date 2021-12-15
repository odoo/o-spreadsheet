import { deepCopy } from "../../src/helpers";

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

  test.each([new Set(), new Map(), new Set([1]), new Date()])(
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
