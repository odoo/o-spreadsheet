import {
  getUniqueText,
  groupConsecutive,
  isConsecutive,
  lazy,
  memoize,
  range,
} from "@odoo/o-spreadsheet-engine/helpers/misc2";
import seedrandom from "seedrandom";
import { DateTime, deepCopy, deepEquals, UuidGenerator } from "../../src/helpers";

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

  test("copy object without any prototype", () => {
    const obj = Object.create(null, {
      foo: {
        writable: true,
        configurable: true,
        enumerable: true,
        value: "hello",
      },
    });
    const copy = deepCopy(obj);
    expect(copy.foo).toBe("hello");
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
  [{ a: undefined }, { a: undefined }, true],
  [{ a: undefined }, { a: null }, false],
  [{ a: null }, {}, false],
  [{ a: 1, b: undefined }, { a: 1 }, true],
  [undefined, undefined, true],
  [[1], [1], true],
  [[1], [], false],
  [[], [], true],
])("deepEquals %s %s", (o1: any, o2: any, expectedResult) => {
  expect(deepEquals(o1, o2)).toEqual(expectedResult);
  expect(deepEquals(o2, o1)).toEqual(expectedResult);
});

describe("isConsecutive", () => {
  test("consecutive", () => {
    expect(isConsecutive([2, 3, 1])).toBeTruthy();
  });

  test("inconsecutive", () => {
    expect(isConsecutive([5, 1, 2])).toBeFalsy();
  });

  test("sort numerically rather than lexicographically", () => {
    expect(isConsecutive([10, 9, 11])).toBeTruthy();
  });
});

describe("Memoize", () => {
  function smile(str: string) {
    return str + ":)";
  }

  const memoizedFn = memoize(smile);

  test("Can use memoized function", () => {
    expect(memoizedFn("ok ")).toEqual("ok :)");
  });

  test("Memoized function name", () => {
    expect(memoizedFn.name).toEqual("smile (memoized)");
  });
});

describe("UUID", () => {
  test("Can generate UUID on environnement missing window.crypto", () => {
    seedrandom("seed", { global: true });
    jest.spyOn(window, "crypto", "get").mockReturnValue(undefined as unknown as Crypto);

    const uuidGenerator = new UuidGenerator();
    expect(uuidGenerator.uuidv4()).toBe("9d28f280-be50-4a0c-a166-9ba361b2fb6b");
    expect(uuidGenerator.uuidv4()).toBe("9e42e52b-d387-40e8-b284-db1c93448b70");

    expect(uuidGenerator.smallUuid()).toBe("d3d8fa3c-5fd2");
    expect(uuidGenerator.smallUuid()).toBe("1079cad0-d88b");
  });

  test("Can generate UUID on environnement with window.crypto", () => {
    seedrandom("seed", { global: true });
    const mockCrypto = {
      getRandomValues: (array: Uint8Array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
        return array;
      },
    };
    jest.spyOn(window, "crypto", "get").mockReturnValue(mockCrypto as Crypto);

    const uuidGenerator = new UuidGenerator();
    expect(uuidGenerator.uuidv4()).toBe("17698da6-740c-4ed3-bde7-60faf206d0e5");
    expect(uuidGenerator.uuidv4()).toBe("b69741c8-91fd-4ed2-8724-8a56cc8c66db");

    expect(uuidGenerator.smallUuid()).toBe("61025c5c-7a2d");
    expect(uuidGenerator.smallUuid()).toBe("2262468c-923d");
  });
});

describe("getUniqueText", () => {
  test("with no existing text", () => {
    expect(getUniqueText("a", [])).toEqual("a");
  });

  test("with existing text", () => {
    expect(getUniqueText("a", ["a", "a (1)"])).toEqual("a (2)");
  });

  test("with custom compute", () => {
    expect(getUniqueText("a", ["a", "a 1"], { compute: (t, i) => `${t} ${i}` })).toEqual("a 2");
  });

  test("with computeFirstOne", () => {
    expect(getUniqueText("a", [], { computeFirstOne: true })).toEqual("a (1)");
  });

  test("with start", () => {
    expect(getUniqueText("a", ["a"], { start: 2 })).toEqual("a (2)");
  });
});
