import { fromNumber, fromString, N, mul, add, sub, gt, lt, div, lte, eq } from "../src/decimal";

describe("N", () => {
  describe("constructors", () => {
    test("fromNumber", () => {
      expect(fromNumber(1)).toEqual({ d: 1, p: 0 });
      expect(fromNumber(12)).toEqual({ d: 12, p: 0 });
      expect(fromNumber(12.1)).toEqual({ d: 121, p: 1 });
      expect(fromNumber(12.13)).toEqual({ d: 1213, p: 2 });
      expect(fromNumber(-4.321)).toEqual({ d: -4321, p: 3 });
      expect(fromNumber(0.002)).toEqual({ d: 2, p: 3 });
    });

    test("fromString", () => {
      expect(fromString("1")).toEqual({ d: 1, p: 0 });
      expect(fromString("12")).toEqual({ d: 12, p: 0 });
      expect(fromString("12.1")).toEqual({ d: 121, p: 1 });
      expect(fromString("12.13")).toEqual({ d: 1213, p: 2 });
      expect(fromString("-4.321")).toEqual({ d: -4321, p: 3 });
      expect(fromString("0.002")).toEqual({ d: 2, p: 3 });
    });
  });

  describe("exported values", () => {
    test("toNumber", () => {
      expect(new N(1, 0).toNumber()).toBe(1);
      expect(new N(10, 1).toNumber()).toBe(1);
      expect(new N(100, 2).toNumber()).toBe(1);
      expect(new N(12, 1).toNumber()).toEqual(1.2);
      expect(new N(574, 1).toNumber()).toEqual(57.4);
    });

    test("toString", () => {
      expect(new N(1, 0).toString()).toBe("1");
      expect(new N(1, 1).toString()).toBe("0.1");
      expect(new N(20, 0).toString()).toBe("20");
      expect(new N(20, 1).toString()).toBe("2");
      expect(new N(203, 1).toString()).toBe("20.3");
      expect(new N(-123, 2).toString()).toBe("-1.23");
    });

    test("format", () => {
      expect(new N(1, 0).format(2)).toBe("1.00");
      expect(new N(1, 1).format(2)).toBe("0.10");
      expect(new N(12, 2).format(2)).toBe("0.12");
      expect(new N(123, 3).format(2)).toBe("0.12");
      expect(new N(12, 1).format(2)).toBe("1.20");
      expect(new N(12345, 2).format(3)).toBe("123.450");
    });
  });

  describe("arithmetic operations", () => {
    test("mul", () => {
      expect(mul(new N(2, 2), new N(3, 1))).toEqual(new N(6, 3));
      expect(mul(new N(2, 0), new N(5, 1))).toEqual({ d: 1, p: 0 });
    });

    test("add", () => {
      // 2 + 3
      expect(add(new N(2, 0), new N(3, 0))).toEqual({ d: 5, p: 0 });
      // 0.2 + 0.8
      expect(add(new N(2, 1), new N(8, 1))).toEqual({ d: 1, p: 0 });
      // 2 + 0.5
      expect(add(new N(2, 0), new N(5, 1))).toEqual({ d: 25, p: 1 });
    });

    test("sub", () => {
      // 2 -3
      expect(sub(new N(2, 0), new N(3, 0))).toEqual({ d: -1, p: 0 });
      // 0.2 - 0.8
      expect(sub(new N(2, 1), new N(8, 1))).toEqual({ d: -6, p: 1 });
      // 2 - 0.5
      expect(sub(new N(2, 0), new N(5, 1))).toEqual({ d: 15, p: 1 });
    });

    test("add 3 numbers", () => {
      // 12.4 + 42 + 3
      const a = new N(124, 1);
      const b = new N(42, 0);
      const c = new N(3, 0);
      const d = new N(574, 1);
      expect(add(a, add(b, c))).toEqual(d);
    });

    test("div", () => {
      // 2 / 1
      expect(div(new N(2, 0), new N(1, 0))).toEqual({ d: 2, p: 0 });
      // 1 / 2
      expect(div(new N(1, 0), new N(2, 0))).toEqual({ d: 5, p: 1 });
    });

    test("add a number and a string", () => {
      // 12.4 + "abc"
      const a = new N(124, 1);
      const b = "abc";
      let e;
      try {
        add(a, b as any);
      } catch (error) {
        e = error;
      }
      expect(e).toBeDefined();
    });

    test("add a string and a number", () => {
      // "abc" + 12.4
      const a = new N(124, 1);
      const b = "abc";
      let e;
      try {
        add(b as any, a);
      } catch (error) {
        e = error;
      }
      expect(e).toBeDefined();
    });

    test("multiply a number and a string", () => {
      // 12.4 * "abc"
      const a = new N(124, 1);
      const b = "abc";
      let e;
      try {
        mul(a, b as any);
      } catch (error) {
        e = error;
      }
      expect(e).toBeDefined();
    });
  });

  describe("comparison", () => {
    test("eq (=)", () => {
      // 1 = 0
      expect(eq(new N(1, 0), new N(0, 0))).toBe(false);

      // 1 = 1
      expect(eq(new N(1, 0), new N(1, 0))).toBe(true);
    });

    test("gt (>)", () => {
      // 1 > 0
      expect(gt(new N(1, 0), new N(0, 0))).toBe(true);

      // 0 > 1 should be false
      expect(gt(new N(0, 0), new N(1, 0))).toBe(false);
    });

    test("lt (<)", () => {
      // 1 < 0
      expect(lt(new N(1, 0), new N(0, 0))).toBe(false);

      // 0 < 1
      expect(lt(new N(0, 0), new N(1, 0))).toBe(true);
    });

    test("lte (<=)", () => {
      // 1 <= 0
      expect(lte(new N(1, 0), new N(0, 0))).toBe(false);

      // 0 <= 1
      expect(lte(new N(0, 0), new N(1, 0))).toBe(true);
      // 1 <= 1
      expect(lte(new N(1, 0), new N(1, 0))).toBe(true);
    });
  });
});
