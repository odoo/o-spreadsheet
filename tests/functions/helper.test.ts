import { dichotomicSearch } from "../../src/functions/helpers";

describe("Function helpers", () => {
  describe("dichotomicSearch with array sorted in ascending order", () => {
    test("with numbers only", () => {
      expect(dichotomicSearch([0, 1, 2, 3, 4], 0, "nextSmaller", "asc")).toBe(0);
      expect(dichotomicSearch([0, 1, 2, 3, 4], 4, "nextSmaller", "asc")).toBe(4);
      expect(dichotomicSearch([0, 1, 2, 3, 4], 2, "nextSmaller", "asc")).toBe(2);
      expect(dichotomicSearch([0, 1, 2, 3, 4], 22, "nextSmaller", "asc")).toBe(4);
      expect(dichotomicSearch([0, 1, 2, 3, 4], -22, "nextSmaller", "asc")).toBe(-1);
      expect(dichotomicSearch([0, 1, 2, 3, 3], 3, "nextSmaller", "asc")).toBe(4);

      expect(dichotomicSearch([0, 1, 3, 4, 5], 2, "nextGreater", "asc")).toBe(2);
      expect(dichotomicSearch([0, 1, 2, 3, 4], 4, "nextGreater", "asc")).toBe(4);
      expect(dichotomicSearch([0, 1, 2, 3, 4], -1, "nextGreater", "asc")).toBe(0);
      expect(dichotomicSearch([0, 1, 2, 3, 4], 5, "nextGreater", "asc")).toBe(-1);

      expect(dichotomicSearch([0, 1, 2, 3, 4], -1, "strict", "asc")).toBe(-1);
      expect(dichotomicSearch([0, 1, 2, 3, 4], 3, "strict", "asc")).toBe(3);
    });

    test("with strings only", () => {
      expect(dichotomicSearch(["0", "1", "2", "3", "4"], "0", "nextSmaller", "asc")).toBe(0);
      expect(dichotomicSearch(["0", "1", "2", "3", "4"], "4", "nextSmaller", "asc")).toBe(4);
      expect(dichotomicSearch(["0", "1", "2", "3", "4"], "2", "nextSmaller", "asc")).toBe(2);
      expect(dichotomicSearch(["0", "1", "2", "3", "4"], "22", "nextSmaller", "asc")).toBe(2);
      expect(dichotomicSearch(["0", "1", "2", "3", "4"], "9", "nextSmaller", "asc")).toBe(4);
      expect(dichotomicSearch(["0", "1", "2", "3", "4"], "-22", "nextSmaller", "asc")).toBe(-1);
      expect(dichotomicSearch(["0", "1", "3", "3", "4"], "3", "nextSmaller", "asc")).toBe(3);

      expect(dichotomicSearch(["0", "1", "2", "3", "4"], "5", "nextGreater", "asc")).toBe(-1);
      expect(dichotomicSearch(["1", "2", "3", "4"], "0", "nextGreater", "asc")).toBe(0);
      expect(dichotomicSearch(["0", "1", "3", "4"], "2", "nextGreater", "asc")).toBe(2);
      expect(dichotomicSearch(["0", "1", "3", "3", "4"], "3", "nextGreater", "asc")).toBe(3);

      expect(dichotomicSearch(["0", "1", "3", "4"], "2", "strict", "asc")).toBe(-1);
      expect(dichotomicSearch(["0", "1", "3", "3", "4"], "1", "strict", "asc")).toBe(1);
    });

    test("search number in strings and numbers", () => {
      expect(dichotomicSearch([0, "a", "a", "a", "a"], 0, "nextSmaller", "asc")).toBe(0);
      expect(dichotomicSearch(["a", "a", "a", "a", 0], 0, "nextSmaller", "asc")).toBe(4);
      expect(dichotomicSearch(["a", "a", 0, "a", "a"], 0, "nextSmaller", "asc")).toBe(2);
      expect(dichotomicSearch(["a", "a", "a", "a", "a"], 0, "nextGreater", "asc")).toBe(-1);
      expect(dichotomicSearch(["0", "0", "a", 0, "0"], 0, "nextGreater", "asc")).toBe(3);
      expect(dichotomicSearch(["0", "0", "a", 0, "0"], 0, "strict", "asc")).toBe(3);
    });

    test("search string in strings and numbers", () => {
      const u = undefined;
      expect(dichotomicSearch(["a", u, u, u, u], "a", "nextSmaller", "asc")).toBe(0);
      expect(dichotomicSearch([u, u, u, u, "a"], "a", "nextSmaller", "asc")).toBe(4);
      expect(dichotomicSearch([u, u, "a", u, u], "a", "nextSmaller", "asc")).toBe(2);
      expect(dichotomicSearch([u, u, u, u, u], "a", "nextGreater", "asc")).toBe(-1);
      expect(dichotomicSearch([u, "0", u, u, u], "0", "nextGreater", "asc")).toBe(1);
      expect(dichotomicSearch([u, "0", u, u, u], "0", "strict", "asc")).toBe(1);
    });

    test("search string in strings and numbers", () => {
      expect(dichotomicSearch(["a", 0, 0, 0, 0], "a", "nextSmaller", "asc")).toBe(0);
      expect(dichotomicSearch([0, 0, 0, 0, "a"], "a", "nextSmaller", "asc")).toBe(4);
      expect(dichotomicSearch([0, 0, "a", 0, 0], "a", "nextSmaller", "asc")).toBe(2);
      expect(dichotomicSearch([0, 0, 0, 0, 0], "a", "nextGreater", "asc")).toBe(-1);
      expect(dichotomicSearch([0, "0", 0, 0, 0], "0", "nextGreater", "asc")).toBe(1);
      expect(dichotomicSearch([0, "0", 0, 0, 0], "0", "strict", "asc")).toBe(1);
    });
  });

  describe("dichotomicSuccessorSearch", () => {
    test("with numbers only", () => {
      expect(dichotomicSearch([4, 3, 2, 1, 0], 4, "nextGreater", "desc")).toBe(0);
      expect(dichotomicSearch([4, 3, 2, 1, 0], 0, "nextGreater", "desc")).toBe(4);
      expect(dichotomicSearch([4, 3, 2, 1, 0], 2, "nextGreater", "desc")).toBe(2);
      expect(dichotomicSearch([4, 3, 2, 1, 0], 22, "nextGreater", "desc")).toBe(-1);
      expect(dichotomicSearch([4, 3, 2, 1, 0], -22, "nextGreater", "desc")).toBe(4);
      expect(dichotomicSearch([3, 3, 2, 1, 0], 3, "nextGreater", "desc")).toBe(0);

      expect(dichotomicSearch([4, 3, 2, 1, 0], 2, "nextSmaller", "desc")).toBe(2);
      expect(dichotomicSearch([4, 3, 2, 1, 0], 22, "nextSmaller", "desc")).toBe(0);
      expect(dichotomicSearch([4, 3, 2, 1, 0], -22, "nextSmaller", "desc")).toBe(-1);
      expect(dichotomicSearch([3, 3, 2, 1, 0], 3, "nextSmaller", "desc")).toBe(0);

      expect(dichotomicSearch([4, 3, 2, 1, 0], -22, "strict", "desc")).toBe(-1);
      expect(dichotomicSearch([3, 3, 2, 1, 0], 0, "strict", "desc")).toBe(4);
    });

    test("with strings only", () => {
      expect(dichotomicSearch(["4", "3", "2", "1", "0"], "0", "nextGreater", "desc")).toBe(4);
      expect(dichotomicSearch(["4", "3", "2", "1", "0"], "4", "nextGreater", "desc")).toBe(0);
      expect(dichotomicSearch(["4", "3", "2", "1", "0"], "2", "nextGreater", "desc")).toBe(2);
      expect(dichotomicSearch(["4", "3", "2", "1", "0"], "22", "nextGreater", "desc")).toBe(1);
      expect(dichotomicSearch(["4", "3", "2", "1", "0"], "9", "nextGreater", "desc")).toBe(-1);
      expect(dichotomicSearch(["4", "3", "2", "1", "0"], "-22", "nextGreater", "desc")).toBe(4);
      expect(dichotomicSearch(["4", "3", "2", "1", "0"], "3", "nextGreater", "desc")).toBe(1);

      expect(dichotomicSearch(["4", "3", "2", "1", "0"], "22", "nextSmaller", "desc")).toBe(2);
      expect(dichotomicSearch(["4", "3", "2", "1", "0"], "9", "nextSmaller", "desc")).toBe(0);
      expect(dichotomicSearch(["4", "3", "2", "1", "0"], "-22", "nextSmaller", "desc")).toBe(-1);
      expect(dichotomicSearch(["4", "3", "2", "1", "0"], "3", "nextSmaller", "desc")).toBe(1);
      expect(dichotomicSearch(["3", "3", "2", "1", "0"], "3", "nextSmaller", "desc")).toBe(0);

      expect(dichotomicSearch(["4", "3", "2", "1", "0"], "3", "strict", "desc")).toBe(1);
      expect(dichotomicSearch(["3", "3", "2", "1", "0"], "a", "strict", "desc")).toBe(-1);
    });

    test("search number in strings and numbers", () => {
      expect(dichotomicSearch([0, "a", "a", "a", "a"], 0, "nextGreater", "desc")).toBe(0);
      expect(dichotomicSearch(["a", "a", "a", "a", 0], 0, "nextGreater", "desc")).toBe(4);
      expect(dichotomicSearch(["a", "a", 0, "a", "a"], 0, "nextGreater", "desc")).toBe(2);
      expect(dichotomicSearch(["a", "a", "a", "a", "a"], 0, "nextSmaller", "desc")).toBe(-1);
      expect(dichotomicSearch(["0", "0", "a", 0, "0"], 0, "nextSmaller", "desc")).toBe(3);
      expect(dichotomicSearch(["0", "0", "a", 0, "0"], 0, "strict", "desc")).toBe(3);
    });

    test("search string in strings and numbers", () => {
      const u = undefined;
      expect(dichotomicSearch(["a", u, u, u, u], "a", "nextGreater", "desc")).toBe(0);
      expect(dichotomicSearch([u, u, u, u, "a"], "a", "nextGreater", "desc")).toBe(4);
      expect(dichotomicSearch([u, u, "a", u, u], "a", "nextGreater", "desc")).toBe(2);
      expect(dichotomicSearch([u, u, u, u, u], "a", "nextSmaller", "desc")).toBe(-1);
      expect(dichotomicSearch([u, "0", u, u, u], "0", "nextSmaller", "desc")).toBe(1);
      expect(dichotomicSearch([u, "0", u, u, u], "0", "strict", "desc")).toBe(1);
    });

    test("search string in strings and numbers", () => {
      expect(dichotomicSearch(["a", 0, 0, 0, 0], "a", "nextGreater", "desc")).toBe(0);
      expect(dichotomicSearch([0, 0, 0, 0, "a"], "a", "nextGreater", "desc")).toBe(4);
      expect(dichotomicSearch([0, 0, "a", 0, 0], "a", "nextGreater", "desc")).toBe(2);
      expect(dichotomicSearch([0, 0, 0, 0, 0], "a", "nextSmaller", "desc")).toBe(-1);
      expect(dichotomicSearch([0, "0", 0, 0, 0], "0", "nextSmaller", "desc")).toBe(1);
      expect(dichotomicSearch([0, "0", 0, 0, 0], "0", "strict", "desc")).toBe(1);
    });
  });
});
