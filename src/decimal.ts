/**
 * Custom Number class, because numbers are not cool enough, we need our own!
 *
 * Seriously, we just need numbers that kind of works like expected,
 * like 0.1 + 0.2 === 0.3
 */

const SEPARATOR = ".";

/**
 * Main class
 *   d: an integer which contains all the digits of the represented number
 *   p: power of 10 that we need to divide the first number to get the
 *      represented value
 *
 * Examples:
 *   [n, 0] <--> n
 *   [123, 1] <--> 12.3
 *   [3, 2] <--> 0.03
 */
export class N {
  d: number;
  p: number;
  constructor(d, p) {
    while (p && d % 10 === 0) {
      d = d / 10;
      p--;
    }
    this.d = d;
    this.p = p;
  }

  toNumber(): number {
    let d = this.d;
    let p = this.p;
    while (p > 0) {
      d = d / 10;
      p--;
    }
    return d;
  }

  toString(): string {
    return toStr(this.d, this.p);
  }

  format(decimalDigits: number = 2): string {
    let { d, p } = this;
    if (p <= decimalDigits) {
      d = d * Math.pow(10, decimalDigits - p);
      p = decimalDigits;
      return toStr(d, p);
    }
    d = Math.round(d / Math.pow(10, p - decimalDigits));
    p = decimalDigits;
    return toStr(d, p);
  }
}

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------
function roundDecimalStr(str: string, next: string): string {
  if ("56789".includes(next)) {
    let digits = Number(str) + 1;
    while (digits % 10 === 0) {
      digits = digits / 10;
    }
    return String(digits);
  }
  return str;
}

function toStr(d: number, p: number): string {
  const digitStr = String(d);
  if (p === 0) {
    return digitStr;
  }
  const index = digitStr.length - p;
  if (index < 0) {
    return (
      "0.".padEnd(2 - index, "0") +
      roundDecimalStr(digitStr.slice(0, 10 + index), digitStr[10 + index])
    );
  }
  const decimals = digitStr.slice(index, index + 10);
  if (decimals === "9999999999") {
    return String(Number(digitStr.slice(0, index)) + 1);
  }
  return (
    (digitStr.slice(0, index) || "0") + SEPARATOR + roundDecimalStr(decimals, digitStr[index + 10])
  );
}

//------------------------------------------------------------------------------
// Constructors
//------------------------------------------------------------------------------

/**
 * Convert a number to a N
 */
export function fromNumber(n: number): N {
  if (Number.isInteger(n)) {
    return new N(n, 0);
  }
  let p = 0;
  let d = n;
  for (let i = 1; i <= 16; i++) {
    d = n * Math.pow(10, i);
    p++;
    if (Number.isInteger(d)) {
      return new N(d, p);
    }
  }
  return new N(Math.round(d), p);
}

export function fromString(s: string): N {
  const index = s.indexOf(SEPARATOR);
  let p;
  if (index > -1) {
    p = s.length - index - 1;
    s = s.replace(".", "");
  } else {
    p = 0;
  }
  return new N(Number(s), p);
}

//------------------------------------------------------------------------------
// Arithmetic operations
//------------------------------------------------------------------------------

/**
 * Multiply two N
 */
export function mul(n1: N, n2: N): N {
  if (!(n1 instanceof N && n2 instanceof N)) {
    throw new Error("Invalid number");
  }
  return new N(n1.d * n2.d, n1.p + n2.p);
}

/**
 * Add two N
 */
export function add(n1: N, n2: N): N {
  if (n1 instanceof N && n2 instanceof N) {
    let { d: d1, p: p1 } = n1;
    let { d: d2, p: p2 } = n2;
    if (p1 === p2) {
      return new N(d1 + d2, p1);
    }
    if (p1 > p2) {
      d2 = d2 * Math.pow(10, p1 - p2);
    } else {
      d1 = d1 * Math.pow(10, p2 - p1);
      p1 = p2;
    }
    return new N(d1 + d2, p1);
  } else {
    throw new Error("Invalid number");
  }
}

/**
 * Substract two N
 */
export function sub(n: N, { d: d2, p: p2 }: N): N {
  return add(n, new N(-d2, p2));
}

/**
 * Divide two N
 */
export function div({ d: d1, p: p1 }: N, { d: d2, p: p2 }: N): N {
  return fromNumber((d1 * Math.pow(10, p2 - p1)) / d2);
}

/**
 * Return true if n1 = n2
 */
export function eq({ d: d1, p: p1 }: N, { d: d2, p: p2 }: N): boolean {
  return p1 === p2 && d1 === d2;
}

/**
 * Return true if n1 > n2
 */
export function gt({ d: d1, p: p1 }: N, { d: d2, p: p2 }: N): boolean {
  if (p1 === p2) {
    return d1 > d2;
  }
  if (p1 > p2) {
    d2 = d2 * Math.pow(10, p1 - p2);
  } else {
    d1 = d1 * Math.pow(10, p2 - p1);
  }
  return d1 > d2;
}

/**
 * Return true if n1 >= n2
 */
export function gte(n1: N, n2: N): boolean {
  return eq(n1, n2) || gt(n1, n2);
}

/**
 * Return true if n1 < n2
 */
export function lt({ d: d1, p: p1 }: N, { d: d2, p: p2 }: N): boolean {
  if (p1 === p2) {
    return d1 < d2;
  }
  if (p1 > p2) {
    d2 = d2 * Math.pow(10, p1 - p2);
  } else {
    d1 = d1 * Math.pow(10, p2 - p1);
  }
  return d1 < d2;
}

/**
 * Return true if n1 <= n2
 */
export function lte(n1: N, n2: N): boolean {
  return eq(n1, n2) || lt(n1, n2);
}
