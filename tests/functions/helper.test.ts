import { dichotomicSearch as dichotomicSearchUniteData } from "../../src/functions/helpers";
import { isValidLocale } from "../../src/helpers/locale";
import { CellValue, DEFAULT_LOCALE } from "../../src/types";

function getItem(arr: any[], i: number) {
  return arr[i];
}

const u = undefined;

function dichotomicSearch<T>(
  data: T,
  target: CellValue,
  mode: "nextGreater" | "nextSmaller" | "strict",
  sortOrder: "asc" | "desc",
  rangeLength: number,
  getValueInData: (range: T, index: number) => CellValue | undefined
): number {
  return dichotomicSearchUniteData(
    data,
    { value: target },
    mode,
    sortOrder,
    rangeLength,
    getValueInData
  );
}

describe("Function helpers", () => {
  describe("dichotomicSearch with array sorted in ascending order", () => {
    test("with numbers only", () => {
      expect(dichotomicSearch([0, 1, 2, 3, 4], 0, "nextSmaller", "asc", 5, getItem)).toBe(0);
      expect(dichotomicSearch([0, 1, 2, 3, 4], 4, "nextSmaller", "asc", 5, getItem)).toBe(4);
      expect(dichotomicSearch([0, 1, 2, 3, 4], 2, "nextSmaller", "asc", 5, getItem)).toBe(2);
      expect(dichotomicSearch([0, 1, 2, 3, 4], 22, "nextSmaller", "asc", 5, getItem)).toBe(4);
      expect(dichotomicSearch([0, 1, 2, 3, 4], -22, "nextSmaller", "asc", 5, getItem)).toBe(-1);
      expect(dichotomicSearch([0, 1, 2, 3, 3], 3, "nextSmaller", "asc", 5, getItem)).toBe(4);

      expect(dichotomicSearch([0, 1, 3, 4, 5], 2, "nextGreater", "asc", 5, getItem)).toBe(2);
      expect(dichotomicSearch([0, 1, 2, 3, 4], 4, "nextGreater", "asc", 5, getItem)).toBe(4);
      expect(dichotomicSearch([0, 1, 2, 3, 4], -1, "nextGreater", "asc", 5, getItem)).toBe(0);
      expect(dichotomicSearch([0, 1, 2, 3, 4], 5, "nextGreater", "asc", 5, getItem)).toBe(-1);
      expect(dichotomicSearch([0, 1, 2, 3, 4], -1, "strict", "asc", 5, getItem)).toBe(-1);
      expect(dichotomicSearch([0, 1, 2, 3, 4], 3, "strict", "asc", 5, getItem)).toBe(3);
    });

    test("with strings only", () => {
      expect(
        dichotomicSearch(["0", "1", "2", "3", "4"], "0", "nextSmaller", "asc", 5, getItem)
      ).toBe(0);
      expect(
        dichotomicSearch(["0", "1", "2", "3", "4"], "4", "nextSmaller", "asc", 5, getItem)
      ).toBe(4);
      expect(
        dichotomicSearch(["0", "1", "2", "3", "4"], "2", "nextSmaller", "asc", 5, getItem)
      ).toBe(2);
      expect(
        dichotomicSearch(["0", "1", "2", "3", "4"], "22", "nextSmaller", "asc", 5, getItem)
      ).toBe(2);
      expect(
        dichotomicSearch(["0", "1", "2", "3", "4"], "9", "nextSmaller", "asc", 5, getItem)
      ).toBe(4);
      expect(
        dichotomicSearch(["0", "1", "2", "3", "4"], "-22", "nextSmaller", "asc", 5, getItem)
      ).toBe(-1);
      expect(
        dichotomicSearch(["0", "1", "3", "3", "4"], "3", "nextSmaller", "asc", 5, getItem)
      ).toBe(3);

      expect(
        dichotomicSearch(["0", "1", "2", "3", "4"], "5", "nextGreater", "asc", 5, getItem)
      ).toBe(-1);
      expect(dichotomicSearch(["1", "2", "3", "4"], "0", "nextGreater", "asc", 5, getItem)).toBe(0);
      expect(dichotomicSearch(["0", "1", "3", "4"], "2", "nextGreater", "asc", 5, getItem)).toBe(2);
      expect(
        dichotomicSearch(["0", "1", "3", "3", "4"], "3", "nextGreater", "asc", 5, getItem)
      ).toBe(3);
      expect(dichotomicSearch(["0", "1", "3", "4"], "2", "strict", "asc", 5, getItem)).toBe(-1);
      expect(dichotomicSearch(["0", "1", "3", "3", "4"], "1", "strict", "asc", 5, getItem)).toBe(1);
    });

    test("search number in strings and numbers", () => {
      expect(dichotomicSearch([0, "a", "a", "a", "a"], 0, "nextSmaller", "asc", 5, getItem)).toBe(
        0
      );
      expect(dichotomicSearch(["a", "a", "a", "a", 0], 0, "nextSmaller", "asc", 5, getItem)).toBe(
        4
      );
      expect(dichotomicSearch(["a", "a", 0, "a", "a"], 0, "nextSmaller", "asc", 5, getItem)).toBe(
        2
      );
      expect(dichotomicSearch(["a", "a", "a", "a", "a"], 0, "nextGreater", "asc", 5, getItem)).toBe(
        -1
      );
      expect(dichotomicSearch(["0", "0", "a", 0, "0"], 0, "nextGreater", "asc", 5, getItem)).toBe(
        3
      );
    });

    test("search string in strings and numbers", () => {
      expect(dichotomicSearch(["a", u, u, u, u], "a", "nextSmaller", "asc", 5, getItem)).toBe(0);
      expect(dichotomicSearch([u, u, u, u, "a"], "a", "nextSmaller", "asc", 5, getItem)).toBe(4);
      expect(dichotomicSearch([u, u, "a", u, u], "a", "nextSmaller", "asc", 5, getItem)).toBe(2);
      expect(dichotomicSearch([u, u, u, u, u], "a", "nextGreater", "asc", 5, getItem)).toBe(-1);
      expect(dichotomicSearch([u, "0", u, u, u], "0", "nextGreater", "asc", 5, getItem)).toBe(1);
      expect(dichotomicSearch([u, "0", u, u, u], "0", "strict", "asc", 5, getItem)).toBe(1);
      expect(dichotomicSearch([u, u, u, u, 1], 1, "nextSmaller", "asc", 5, getItem)).toBe(4);
      expect(
        dichotomicSearch([[u], [u], [u], [u], [1]], 1, "nextSmaller", "asc", 5, (el, index) => {
          return el[index][0];
        })
      ).toBe(4);
    });

    test("search string in strings and numbers", () => {
      expect(dichotomicSearch(["a", 0, 0, 0, 0], "a", "nextSmaller", "asc", 5, getItem)).toBe(0);
      expect(dichotomicSearch([0, 0, 0, 0, "a"], "a", "nextSmaller", "asc", 5, getItem)).toBe(4);
      expect(dichotomicSearch([0, 0, "a", 0, 0], "a", "nextSmaller", "asc", 5, getItem)).toBe(2);
      expect(dichotomicSearch([0, 0, 0, 0, 0], "a", "nextGreater", "asc", 5, getItem)).toBe(-1);
      expect(dichotomicSearch([0, "0", 0, 0, 0], "0", "nextGreater", "asc", 5, getItem)).toBe(1);
      expect(dichotomicSearch([0, "0", 0, 0, 0], "0", "strict", "asc", 5, getItem)).toBe(1);
    });
  });

  describe("dichotomicSearch with array sorted in descending order", () => {
    test("with numbers only", () => {
      expect(dichotomicSearch([4, 3, 2, 1, 0], 4, "nextGreater", "desc", 5, getItem)).toBe(0);
      expect(dichotomicSearch([4, 3, 2, 1, 0], 0, "nextGreater", "desc", 5, getItem)).toBe(4);
      expect(dichotomicSearch([4, 3, 2, 1, 0], 2, "nextGreater", "desc", 5, getItem)).toBe(2);
      expect(dichotomicSearch([4, 3, 2, 1, 0], 22, "nextGreater", "desc", 5, getItem)).toBe(-1);
      expect(dichotomicSearch([4, 3, 2, 1, 0], -22, "nextGreater", "desc", 5, getItem)).toBe(4);
      expect(dichotomicSearch([3, 3, 2, 1, 0], 3, "nextGreater", "desc", 5, getItem)).toBe(0);

      expect(dichotomicSearch([4, 3, 2, 1, 0], 2, "nextSmaller", "desc", 5, getItem)).toBe(2);
      expect(dichotomicSearch([4, 3, 2, 1, 0], 22, "nextSmaller", "desc", 5, getItem)).toBe(0);
      expect(dichotomicSearch([4, 3, 2, 1, 0], -22, "nextSmaller", "desc", 5, getItem)).toBe(-1);
      expect(dichotomicSearch([3, 3, 2, 1, 0], 3, "nextSmaller", "desc", 5, getItem)).toBe(0);

      expect(dichotomicSearch([4, 3, 2, 1, 0], -22, "strict", "desc", 5, getItem)).toBe(-1);
      expect(dichotomicSearch([3, 3, 2, 1, 0], 3, "strict", "desc", 5, getItem)).toBe(0);
    });

    test("with strings only", () => {
      expect(
        dichotomicSearch(["4", "3", "2", "1", "0"], "0", "nextGreater", "desc", 5, getItem)
      ).toBe(4);
      expect(
        dichotomicSearch(["4", "3", "2", "1", "0"], "4", "nextGreater", "desc", 5, getItem)
      ).toBe(0);
      expect(
        dichotomicSearch(["4", "3", "2", "1", "0"], "2", "nextGreater", "desc", 5, getItem)
      ).toBe(2);
      expect(
        dichotomicSearch(["4", "3", "2", "1", "0"], "22", "nextGreater", "desc", 5, getItem)
      ).toBe(1);
      expect(
        dichotomicSearch(["4", "3", "2", "1", "0"], "9", "nextGreater", "desc", 5, getItem)
      ).toBe(-1);
      expect(
        dichotomicSearch(["4", "3", "2", "1", "0"], "-22", "nextGreater", "desc", 5, getItem)
      ).toBe(4);
      expect(
        dichotomicSearch(["4", "3", "2", "1", "0"], "3", "nextGreater", "desc", 5, getItem)
      ).toBe(1);

      expect(
        dichotomicSearch(["4", "3", "2", "1", "0"], "22", "nextSmaller", "desc", 5, getItem)
      ).toBe(2);
      expect(
        dichotomicSearch(["4", "3", "2", "1", "0"], "9", "nextSmaller", "desc", 5, getItem)
      ).toBe(0);
      expect(
        dichotomicSearch(["4", "3", "2", "1", "0"], "-22", "nextSmaller", "desc", 5, getItem)
      ).toBe(-1);
      expect(
        dichotomicSearch(["4", "3", "2", "1", "0"], "3", "nextSmaller", "desc", 5, getItem)
      ).toBe(1);
      expect(
        dichotomicSearch(["3", "3", "2", "1", "0"], "3", "nextSmaller", "desc", 5, getItem)
      ).toBe(0);

      expect(dichotomicSearch(["4", "3", "2", "1", "0"], "3", "strict", "desc", 5, getItem)).toBe(
        1
      );
      expect(dichotomicSearch(["3", "3", "2", "1", "0"], "a", "strict", "desc", 5, getItem)).toBe(
        -1
      );
    });

    test("search number in strings and numbers", () => {
      expect(dichotomicSearch([0, "a", "a", "a", "a"], 0, "nextGreater", "desc", 5, getItem)).toBe(
        0
      );
      expect(dichotomicSearch(["a", "a", "a", "a", 0], 0, "nextGreater", "desc", 5, getItem)).toBe(
        4
      );
      expect(dichotomicSearch(["a", "a", 0, "a", "a"], 0, "nextGreater", "desc", 5, getItem)).toBe(
        2
      );
      expect(
        dichotomicSearch(["a", "a", "a", "a", "a"], 0, "nextSmaller", "desc", 5, getItem)
      ).toBe(-1);
      expect(dichotomicSearch(["0", "0", "a", 0, "0"], 0, "nextSmaller", "desc", 5, getItem)).toBe(
        3
      );
    });

    test("search string in strings and numbers", () => {
      expect(dichotomicSearch(["a", u, u, u, u], "a", "nextGreater", "desc", 5, getItem)).toBe(0);
      expect(dichotomicSearch([u, u, u, u, "a"], "a", "nextGreater", "desc", 5, getItem)).toBe(4);
      expect(dichotomicSearch([u, u, "a", u, u], "a", "nextGreater", "desc", 5, getItem)).toBe(2);
      expect(dichotomicSearch([u, u, u, u, u], "a", "nextSmaller", "desc", 5, getItem)).toBe(-1);
      expect(dichotomicSearch([u, "0", u, u, u], "0", "nextSmaller", "desc", 5, getItem)).toBe(1);
      expect(dichotomicSearch([u, "0", u, u, u], "0", "strict", "desc", 5, getItem)).toBe(1);
    });

    test("search string in strings and numbers", () => {
      expect(dichotomicSearch(["a", 0, 0, 0, 0], "a", "nextGreater", "desc", 5, getItem)).toBe(0);
      expect(dichotomicSearch([0, 0, 0, 0, "a"], "a", "nextGreater", "desc", 5, getItem)).toBe(4);
      expect(dichotomicSearch([0, 0, "a", 0, 0], "a", "nextGreater", "desc", 5, getItem)).toBe(2);
      expect(dichotomicSearch([0, 0, 0, 0, 0], "a", "nextSmaller", "desc", 5, getItem)).toBe(-1);
      expect(dichotomicSearch([0, "0", 0, 0, 0], "0", "nextSmaller", "desc", 5, getItem)).toBe(1);
      expect(dichotomicSearch([0, "0", 0, 0, 0], "0", "strict", "desc", 5, getItem)).toBe(1);
    });
  });

  describe("dichotomicSearch with multi-dimensional array", () => {
    const array = [
      [0, 10, 20],
      [3, 4, 5],
      [6, 7, 8],
    ];

    test("search in rows", () => {
      const getItemInRows = (arr: number[][], i: number) => arr[i][0];
      expect(dichotomicSearch(array, 0, "nextSmaller", "asc", 3, getItemInRows)).toBe(0);
      expect(dichotomicSearch(array, 4, "nextSmaller", "asc", 3, getItemInRows)).toBe(1);
      expect(dichotomicSearch(array, 2, "nextSmaller", "asc", 3, getItemInRows)).toBe(0);
      expect(dichotomicSearch(array, 22, "nextSmaller", "asc", 3, getItemInRows)).toBe(2);
      expect(dichotomicSearch(array, -22, "nextSmaller", "asc", 3, getItemInRows)).toBe(-1);

      expect(dichotomicSearch(array, 4, "nextGreater", "asc", 3, getItemInRows)).toBe(2);
      expect(dichotomicSearch(array, -1, "nextGreater", "asc", 3, getItemInRows)).toBe(0);
      expect(dichotomicSearch(array, 7, "nextGreater", "asc", 3, getItemInRows)).toBe(-1);
    });

    test("search in cols", () => {
      const getItemInCols = (arr: number[][], i: number) => arr[0][i];
      expect(dichotomicSearch(array, 0, "nextSmaller", "asc", 3, getItemInCols)).toBe(0);
      expect(dichotomicSearch(array, 4, "nextSmaller", "asc", 3, getItemInCols)).toBe(0);
      expect(dichotomicSearch(array, 12, "nextSmaller", "asc", 3, getItemInCols)).toBe(1);
      expect(dichotomicSearch(array, 22, "nextSmaller", "asc", 3, getItemInCols)).toBe(2);
      expect(dichotomicSearch(array, -22, "nextSmaller", "asc", 3, getItemInCols)).toBe(-1);

      expect(dichotomicSearch(array, 4, "nextGreater", "asc", 3, getItemInCols)).toBe(1);
      expect(dichotomicSearch(array, -1, "nextGreater", "asc", 3, getItemInCols)).toBe(0);
      expect(dichotomicSearch(array, 35, "nextGreater", "asc", 3, getItemInCols)).toBe(-1);
    });
  });

  describe("dichotomicSearch with multi-dimensional sparse array", () => {
    test("search in rows", () => {
      const array1 = [[0], [u], [u]];
      const array2 = [[u], [5], [u]];
      const array3 = [[u], [u], [7]];
      const getItemInRows = (arr: (number | undefined)[][], i: number) => arr[i][0];
      expect(dichotomicSearch(array1, 0, "nextSmaller", "asc", 3, getItemInRows)).toBe(0);
      expect(dichotomicSearch(array1, 8, "nextSmaller", "asc", 3, getItemInRows)).toBe(0);
      expect(dichotomicSearch(array1, -22, "nextSmaller", "asc", 3, getItemInRows)).toBe(-1);

      expect(dichotomicSearch(array2, 0, "nextSmaller", "asc", 3, getItemInRows)).toBe(-1);
      expect(dichotomicSearch(array2, 8, "nextSmaller", "asc", 3, getItemInRows)).toBe(1);
      expect(dichotomicSearch(array2, 2, "nextSmaller", "asc", 3, getItemInRows)).toBe(-1);

      expect(dichotomicSearch(array3, 0, "nextSmaller", "asc", 3, getItemInRows)).toBe(-1);
      expect(dichotomicSearch(array3, 8, "nextSmaller", "asc", 3, getItemInRows)).toBe(2);
      expect(dichotomicSearch(array3, 2, "nextSmaller", "asc", 3, getItemInRows)).toBe(-1);

      expect(dichotomicSearch(array1, 4, "nextGreater", "asc", 3, getItemInRows)).toBe(-1);
      expect(dichotomicSearch(array1, -1, "nextGreater", "asc", 3, getItemInRows)).toBe(0);
      expect(dichotomicSearch(array1, 7, "nextGreater", "asc", 3, getItemInRows)).toBe(-1);

      expect(dichotomicSearch(array2, 4, "nextGreater", "asc", 3, getItemInRows)).toBe(1);
      expect(dichotomicSearch(array2, -1, "nextGreater", "asc", 3, getItemInRows)).toBe(1);
      expect(dichotomicSearch(array2, 7, "nextGreater", "asc", 3, getItemInRows)).toBe(-1);

      expect(dichotomicSearch(array3, 4, "nextGreater", "asc", 3, getItemInRows)).toBe(2);
      expect(dichotomicSearch(array3, -1, "nextGreater", "asc", 3, getItemInRows)).toBe(2);
      expect(dichotomicSearch(array3, 22, "nextGreater", "asc", 3, getItemInRows)).toBe(-1);
    });

    test("search in cols", () => {
      const array1 = [[0, u, u]];
      const array2 = [[u, 5, u]];
      const array3 = [[u, u, 7]];
      const getItemInCols = (arr: (number | undefined)[][], i: number) => arr[0][i];
      expect(dichotomicSearch(array1, 0, "nextSmaller", "asc", 3, getItemInCols)).toBe(0);
      expect(dichotomicSearch(array1, 8, "nextSmaller", "asc", 3, getItemInCols)).toBe(0);
      expect(dichotomicSearch(array1, -22, "nextSmaller", "asc", 3, getItemInCols)).toBe(-1);

      expect(dichotomicSearch(array2, 0, "nextSmaller", "asc", 3, getItemInCols)).toBe(-1);
      expect(dichotomicSearch(array2, 8, "nextSmaller", "asc", 3, getItemInCols)).toBe(1);
      expect(dichotomicSearch(array2, 5, "nextSmaller", "asc", 3, getItemInCols)).toBe(1);

      expect(dichotomicSearch(array3, 0, "nextSmaller", "asc", 3, getItemInCols)).toBe(-1);
      expect(dichotomicSearch(array3, 8, "nextSmaller", "asc", 3, getItemInCols)).toBe(2);
      expect(dichotomicSearch(array3, 2, "nextSmaller", "asc", 3, getItemInCols)).toBe(-1);

      expect(dichotomicSearch(array1, 4, "nextGreater", "asc", 3, getItemInCols)).toBe(-1);
      expect(dichotomicSearch(array1, -1, "nextGreater", "asc", 3, getItemInCols)).toBe(0);
      expect(dichotomicSearch(array1, 7, "nextGreater", "asc", 3, getItemInCols)).toBe(-1);

      expect(dichotomicSearch(array2, 4, "nextGreater", "asc", 3, getItemInCols)).toBe(1);
      expect(dichotomicSearch(array2, -1, "nextGreater", "asc", 3, getItemInCols)).toBe(1);
      expect(dichotomicSearch(array2, 7, "nextGreater", "asc", 3, getItemInCols)).toBe(-1);

      expect(dichotomicSearch(array3, 4, "nextGreater", "asc", 3, getItemInCols)).toBe(2);
      expect(dichotomicSearch(array3, -1, "nextGreater", "asc", 3, getItemInCols)).toBe(2);
      expect(dichotomicSearch(array3, 22, "nextGreater", "asc", 3, getItemInCols)).toBe(-1);
    });
  });
});

describe("Locale helpers", () => {
  test("isValidLocale", () => {
    const locale = DEFAULT_LOCALE;

    expect(isValidLocale(locale)).toBe(true);

    // Missing values
    expect(isValidLocale("en_US")).toBe(false);
    expect(isValidLocale({})).toBe(false);
    expect(isValidLocale({ ...locale, thousandsSeparator: undefined })).toBe(false);
    expect(isValidLocale({ ...locale, decimalSeparator: undefined })).toBe(false);
    expect(isValidLocale({ ...locale, dateFormat: undefined })).toBe(false);
    expect(isValidLocale({ ...locale, timeFormat: undefined })).toBe(false);
    expect(isValidLocale({ ...locale, formulaArgSeparator: undefined })).toBe(false);
    expect(isValidLocale({ ...locale, code: undefined })).toBe(false);
    expect(isValidLocale({ ...locale, name: undefined })).toBe(false);

    expect(isValidLocale({ ...locale, thousandsSeparator: "" })).toBe(false);
    expect(isValidLocale({ ...locale, decimalSeparator: "" })).toBe(false);
    expect(isValidLocale({ ...locale, dateFormat: "" })).toBe(false);
    expect(isValidLocale({ ...locale, timeFormat: "" })).toBe(false);
    expect(isValidLocale({ ...locale, formulaArgSeparator: "" })).toBe(false);
    expect(isValidLocale({ ...locale, code: "" })).toBe(false);
    expect(isValidLocale({ ...locale, name: "" })).toBe(false);

    // Invalid formats
    expect(isValidLocale({ ...locale, dateFormat: "hey" })).toBe(false);
    expect(isValidLocale({ ...locale, dateFormat: "mmmmmmmm/ddddddd/y" })).toBe(false);
    expect(isValidLocale({ ...locale, dateFormat: "not a format" })).toBe(false);

    expect(isValidLocale({ ...locale, timeFormat: "hey" })).toBe(false);
    expect(isValidLocale({ ...locale, timeFormat: "hhhhhhh:mmmmm:sssssss" })).toBe(false);
    expect(isValidLocale({ ...locale, timeFormat: "not a format" })).toBe(false);

    // Invalid formulaArgSeparator
    expect(isValidLocale({ ...locale, formulaArgSeparator: ".", decimalSeparator: "." })).toBe(
      false
    );
    expect(isValidLocale({ ...locale, formulaArgSeparator: ",", decimalSeparator: "," })).toBe(
      false
    );
  });
});
