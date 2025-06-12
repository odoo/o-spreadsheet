export class SequenceSet {
  private ranges: { min: number; max: number }[] = [];
  private _length: number = 0;

  add(min: number, max: number) {
    if (min > max) return;
    const newRanges = new Array();
    let newLength = 0;
    for (const range of this.ranges) {
      if ((min <= range.min && range.min <= max) || (min <= range.max && range.max <= max)) {
        min = Math.min(min, range.min);
        max = Math.max(max, range.max);
      } else {
        newRanges.push(range);
        newLength += range.max - range.min + 1;
      }
    }
    newRanges.push({ min, max });
    newLength += max - min + 1;
    newRanges.sort((a, b) => a.min - b.min);
    this.ranges = newRanges;
    this._length = newLength;
  }

  remove(num: number): boolean {
    const index = this.getRangeIndex(num);
    if (index < 0) return false;
    const range = this.ranges[index];
    const newRanges = [
      { min: range.min, max: num - 1 },
      { min: num + 1, max: range.max },
    ].filter((range) => range.min <= range.max);
    this.ranges = Array.prototype.concat(
      this.ranges.slice(0, index),
      newRanges,
      this.ranges.slice(index + 1)
    );
    return true;
  }

  has(num: number): boolean {
    return this.getRangeIndex(num) >= 0;
  }

  private getRangeIndex(num: number): number {
    // Dichotomic ?
    for (const [index, range] of this.ranges.entries()) {
      if (range.min <= num && num <= range.max) {
        return index;
      }
    }
    return -1;
  }

  *[Symbol.iterator](): Generator<number> {
    for (const range of this.ranges) {
      for (let index = range.min; index <= range.max; index++) {
        yield index;
      }
    }
  }

  *entries(): Generator<[number, number]> {
    let i = 0;
    for (const range of this.ranges) {
      for (let index = range.min; index <= range.max; index++) {
        yield [i++, index];
      }
    }
  }

  *consecutives(): Generator<[number, number]> {
    for (const range of this.ranges) {
      yield [range.min, range.max];
    }
  }

  get length(): number {
    return this._length;
  }
}
