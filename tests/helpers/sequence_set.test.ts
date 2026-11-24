import seedrandom from "seedrandom";
import { SequenceSet } from "../../src/helpers/misc";

function createSequenceSet(...sequences: [number, number][]): SequenceSet {
  const set = new SequenceSet();
  for (const [min, max] of sequences) {
    set.add(min, max);
  }
  return set;
}

describe("SequenceSet", () => {
  test("empty set", () => {
    const set = new SequenceSet();
    expect(set.size).toBe(0);
    expect(set.has(0)).toBe(false);
    expect([...set]).toEqual([]);
    expect([...set.consecutives()]).toEqual([]);
  });

  test("add a single value", () => {
    const set = createSequenceSet([3, 3]);
    expect(set.size).toBe(1);
    expect(set.has(3)).toBe(true);
    expect(set.has(2)).toBe(false);
    expect(set.has(4)).toBe(false);
    expect([...set.consecutives()]).toEqual([[3, 3]]);
  });

  test("add a sequence", () => {
    const set = createSequenceSet([2, 5]);
    expect(set.size).toBe(4);
    expect([...set]).toEqual([2, 3, 4, 5]);
    expect([...set.consecutives()]).toEqual([[2, 5]]);
  });

  test("adding an inverted sequence does nothing", () => {
    const set = createSequenceSet([5, 2]);
    expect(set.size).toBe(0);
    expect([...set]).toEqual([]);
  });

  test("disjoint sequences are kept sorted whatever the insertion order", () => {
    const set = createSequenceSet([10, 12], [0, 1], [5, 6]);
    expect(set.size).toBe(7);
    expect([...set]).toEqual([0, 1, 5, 6, 10, 11, 12]);
    expect([...set.consecutives()]).toEqual([
      [0, 1],
      [5, 6],
      [10, 12],
    ]);
  });

  test("adjacent sequences are merged", () => {
    expect([...createSequenceSet([0, 2], [3, 5]).consecutives()]).toEqual([[0, 5]]);
    expect([...createSequenceSet([3, 5], [0, 2]).consecutives()]).toEqual([[0, 5]]);
    expect([...createSequenceSet([0, 2], [4, 5], [3, 3]).consecutives()]).toEqual([[0, 5]]);
  });

  test("overlapping sequences are merged", () => {
    const set = createSequenceSet([0, 4], [2, 6]);
    expect(set.size).toBe(7);
    expect([...set.consecutives()]).toEqual([[0, 6]]);
  });

  test("adding a sequence contained in an existing one changes nothing", () => {
    const set = createSequenceSet([0, 10], [3, 5]);
    expect(set.size).toBe(11);
    expect([...set.consecutives()]).toEqual([[0, 10]]);
  });

  test("adding a sequence spanning several existing ones merges them all", () => {
    const set = createSequenceSet([1, 2], [5, 6], [9, 10], [20, 21], [0, 12]);
    expect(set.size).toBe(15);
    expect([...set.consecutives()]).toEqual([
      [0, 12],
      [20, 21],
    ]);
  });

  test("adding a sequence between two existing ones without touching them", () => {
    const set = createSequenceSet([0, 1], [10, 11], [5, 6]);
    expect([...set.consecutives()]).toEqual([
      [0, 1],
      [5, 6],
      [10, 11],
    ]);
  });

  test("remove a value not in the set", () => {
    const set = createSequenceSet([2, 4]);
    expect(set.remove(0)).toBe(false);
    expect(set.remove(5)).toBe(false);
    expect(set.size).toBe(3);
    expect([...set.consecutives()]).toEqual([[2, 4]]);
  });

  test("remove a single value sequence", () => {
    const set = createSequenceSet([0, 1], [3, 3], [5, 6]);
    expect(set.remove(3)).toBe(true);
    expect(set.has(3)).toBe(false);
    expect(set.size).toBe(4);
    expect([...set.consecutives()]).toEqual([
      [0, 1],
      [5, 6],
    ]);
  });

  test("remove the bounds of a sequence", () => {
    const set = createSequenceSet([2, 6]);
    expect(set.remove(2)).toBe(true);
    expect(set.remove(6)).toBe(true);
    expect(set.size).toBe(3);
    expect([...set.consecutives()]).toEqual([[3, 5]]);
  });

  test("remove a value in the middle of a sequence splits it", () => {
    const set = createSequenceSet([2, 6]);
    expect(set.remove(4)).toBe(true);
    expect(set.has(4)).toBe(false);
    expect(set.size).toBe(4);
    expect([...set.consecutives()]).toEqual([
      [2, 3],
      [5, 6],
    ]);
  });

  test("a removed value can be added back", () => {
    const set = createSequenceSet([2, 6]);
    set.remove(4);
    set.add(4, 4);
    expect(set.size).toBe(5);
    expect([...set.consecutives()]).toEqual([[2, 6]]);
  });

  test("entries yields the index of each value", () => {
    const set = createSequenceSet([0, 1], [5, 6]);
    expect([...set.entries()]).toEqual([
      [0, 0],
      [1, 1],
      [2, 5],
      [3, 6],
    ]);
  });

  test("behaves like a Set on random operations", () => {
    const rng = seedrandom("sequence set");
    const randomInt = (max: number) => Math.floor(rng() * max);
    const sequenceSet = new SequenceSet();
    const expected = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      if (rng() < 0.5) {
        const min = randomInt(100);
        const max = min + randomInt(10);
        sequenceSet.add(min, max);
        for (let n = min; n <= max; n++) {
          expected.add(n);
        }
      } else {
        const n = randomInt(110);
        expect(sequenceSet.remove(n)).toBe(expected.delete(n));
      }
      expect(sequenceSet.size).toBe(expected.size);
    }
    expect([...sequenceSet]).toEqual([...expected].sort((a, b) => a - b));
    for (let n = -1; n <= 110; n++) {
      expect(sequenceSet.has(n)).toBe(expected.has(n));
    }
    const consecutives = [...sequenceSet.consecutives()];
    for (let i = 1; i < consecutives.length; i++) {
      // sequences are sorted, disjoint and never adjacent
      expect(consecutives[i][0]).toBeGreaterThan(consecutives[i - 1][1] + 1);
    }
  });
});
