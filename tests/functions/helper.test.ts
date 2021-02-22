import {
  dichotomicPredecessorSearch,
  dichotomicSuccessorSearch,
} from "../../src/functions/helpers";

describe("Function helpers", () => {
  describe("dichotomicPredecessorSearch", () => {
    test("with numbers only", () => {
      expect(dichotomicPredecessorSearch([0, 1, 2, 3, 4], 0)).toBe(0);
      expect(dichotomicPredecessorSearch([0, 1, 2, 3, 4], 4)).toBe(4);
      expect(dichotomicPredecessorSearch([0, 1, 2, 3, 4], 2)).toBe(2);
      expect(dichotomicPredecessorSearch([0, 1, 2, 3, 4], 22)).toBe(4);
      expect(dichotomicPredecessorSearch([0, 1, 2, 3, 4], -22)).toBe(-1);
      expect(dichotomicPredecessorSearch([0, 1, 2, 3, 3], 3)).toBe(4);
    });

    test("with strings only", () => {
      expect(dichotomicPredecessorSearch(["0", "1", "2", "3", "4"], "0")).toBe(0);
      expect(dichotomicPredecessorSearch(["0", "1", "2", "3", "4"], "4")).toBe(4);
      expect(dichotomicPredecessorSearch(["0", "1", "2", "3", "4"], "2")).toBe(2);
      expect(dichotomicPredecessorSearch(["0", "1", "2", "3", "4"], "22")).toBe(2);
      expect(dichotomicPredecessorSearch(["0", "1", "2", "3", "4"], "9")).toBe(4);
      expect(dichotomicPredecessorSearch(["0", "1", "2", "3", "4"], "-22")).toBe(-1);
      expect(dichotomicPredecessorSearch(["0", "1", "3", "3", "4"], "3")).toBe(3);
    });

    test("search number in strings and numbers", () => {
      expect(dichotomicPredecessorSearch([0, "a", "a", "a", "a"], 0)).toBe(0);
      expect(dichotomicPredecessorSearch(["a", "a", "a", "a", 0], 0)).toBe(4);
      expect(dichotomicPredecessorSearch(["a", "a", 0, "a", "a"], 0)).toBe(2);
      expect(dichotomicPredecessorSearch(["a", "a", "a", "a", "a"], 0)).toBe(-1);
      expect(dichotomicPredecessorSearch(["0", "0", "a", 0, "0"], 0)).toBe(3);
    });

    test("search string in strings and numbers", () => {
      const u = undefined;
      expect(dichotomicPredecessorSearch(["a", u, u, u, u], "a")).toBe(0);
      expect(dichotomicPredecessorSearch([u, u, u, u, "a"], "a")).toBe(4);
      expect(dichotomicPredecessorSearch([u, u, "a", u, u], "a")).toBe(2);
      expect(dichotomicPredecessorSearch([u, u, u, u, u], "a")).toBe(-1);
      expect(dichotomicPredecessorSearch([u, "0", u, u, u], "0")).toBe(1);
    });

    test("search string in strings and numbers", () => {
      expect(dichotomicPredecessorSearch(["a", 0, 0, 0, 0], "a")).toBe(0);
      expect(dichotomicPredecessorSearch([0, 0, 0, 0, "a"], "a")).toBe(4);
      expect(dichotomicPredecessorSearch([0, 0, "a", 0, 0], "a")).toBe(2);
      expect(dichotomicPredecessorSearch([0, 0, 0, 0, 0], "a")).toBe(-1);
      expect(dichotomicPredecessorSearch([0, "0", 0, 0, 0], "0")).toBe(1);
    });
  });

  describe("dichotomicSuccessorSearch", () => {
    test("with numbers only", () => {
      expect(dichotomicSuccessorSearch([4, 3, 2, 1, 0], 4)).toBe(0);
      expect(dichotomicSuccessorSearch([4, 3, 2, 1, 0], 0)).toBe(4);
      expect(dichotomicSuccessorSearch([4, 3, 2, 1, 0], 2)).toBe(2);
      expect(dichotomicSuccessorSearch([4, 3, 2, 1, 0], 22)).toBe(-1);
      expect(dichotomicSuccessorSearch([4, 3, 2, 1, 0], -22)).toBe(4);
      expect(dichotomicSuccessorSearch([3, 3, 2, 1, 0], 3)).toBe(0);
    });

    test("with strings only", () => {
      expect(dichotomicSuccessorSearch(["4", "3", "2", "1", "0"], "0")).toBe(4);
      expect(dichotomicSuccessorSearch(["4", "3", "2", "1", "0"], "4")).toBe(0);
      expect(dichotomicSuccessorSearch(["4", "3", "2", "1", "0"], "2")).toBe(2);
      expect(dichotomicSuccessorSearch(["4", "3", "2", "1", "0"], "22")).toBe(1);
      expect(dichotomicSuccessorSearch(["4", "3", "2", "1", "0"], "9")).toBe(-1);
      expect(dichotomicSuccessorSearch(["4", "3", "2", "1", "0"], "-22")).toBe(4);
      expect(dichotomicSuccessorSearch(["4", "3", "2", "1", "0"], "3")).toBe(1);
    });

    test("search number in strings and numbers", () => {
      expect(dichotomicSuccessorSearch([0, "a", "a", "a", "a"], 0)).toBe(0);
      expect(dichotomicSuccessorSearch(["a", "a", "a", "a", 0], 0)).toBe(4);
      expect(dichotomicSuccessorSearch(["a", "a", 0, "a", "a"], 0)).toBe(2);
      expect(dichotomicSuccessorSearch(["a", "a", "a", "a", "a"], 0)).toBe(-1);
      expect(dichotomicSuccessorSearch(["0", "0", "a", 0, "0"], 0)).toBe(3);
    });

    test("search string in strings and numbers", () => {
      const u = undefined;
      expect(dichotomicSuccessorSearch(["a", u, u, u, u], "a")).toBe(0);
      expect(dichotomicSuccessorSearch([u, u, u, u, "a"], "a")).toBe(4);
      expect(dichotomicSuccessorSearch([u, u, "a", u, u], "a")).toBe(2);
      expect(dichotomicSuccessorSearch([u, u, u, u, u], "a")).toBe(-1);
      expect(dichotomicSuccessorSearch([u, "0", u, u, u], "0")).toBe(1);
    });

    test("search string in strings and numbers", () => {
      expect(dichotomicSuccessorSearch(["a", 0, 0, 0, 0], "a")).toBe(0);
      expect(dichotomicSuccessorSearch([0, 0, 0, 0, "a"], "a")).toBe(4);
      expect(dichotomicSuccessorSearch([0, 0, "a", 0, 0], "a")).toBe(2);
      expect(dichotomicSuccessorSearch([0, 0, 0, 0, 0], "a")).toBe(-1);
      expect(dichotomicSuccessorSearch([0, "0", 0, 0, 0], "0")).toBe(1);
    });
  });
});
