export class ConsecutiveSet {
  // TODO ? Sort them to merge zone and have dichotomic has()
  // TODO ? implements Set<number>
  private ranges: { min: number; max: number }[] = [];
  private empty: boolean = true;

  add(value: number): this {
    return this.addRange(value, value);
  }

  /**
   * @param min lower bound of the range to add, inclusive
   * @param max upper bound of the range to add, inclusive
   */
  addRange(min: number, max: number): this {
    if (min > max) {
      return this;
    }
    this.ranges.push({ min, max });
    this.empty = false;
    return this;
  }

  has(num: number) {
    for (const range of this.ranges) {
      if (range.min <= num && num <= range.max) {
        return true;
      }
    }
    return false;
  }

  get isEmpty() {
    return this.empty;
  }

  *[Symbol.iterator]() {
    const set = new Set<number>();
    for (const range of this.ranges) {
      for (let index = range.min; index <= range.max; index++) {
        if (set.has(index)) {
          continue;
        }
        yield index;
        set.add(index);
      }
    }
  }

  get size() {
    return [...this].length;
  }
}
