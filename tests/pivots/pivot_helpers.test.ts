import { toNormalizedPivotValue } from "../../src/helpers/pivot/pivot_helpers";

describe("toNormalizedPivotValue", () => {
  test("parse values of char field", () => {
    const dimension = {
      type: "char",
      displayName: "A field",
      name: "field_name",
    };
    expect(toNormalizedPivotValue(dimension, "won")).toBe("won");
    expect(toNormalizedPivotValue(dimension, "1")).toBe("1");
    expect(toNormalizedPivotValue(dimension, 1)).toBe("1");
    expect(toNormalizedPivotValue(dimension, "11/2020")).toBe("11/2020");
    expect(toNormalizedPivotValue(dimension, "2020")).toBe("2020");
    expect(toNormalizedPivotValue(dimension, "01/11/2020")).toBe("01/11/2020");
    expect(toNormalizedPivotValue(dimension, "false")).toBe(false);
    expect(toNormalizedPivotValue(dimension, false)).toBe(false);
    expect(toNormalizedPivotValue(dimension, "true")).toBe("true");
  });

  test("parse values of time fields", () => {
    for (const fieldType of ["date", "datetime"]) {
      const dimension = {
        type: fieldType,
        displayName: "A field",
        name: "field_name",
        granularity: "day",
      };
      // day
      expect(toNormalizedPivotValue(dimension, "1/11/2020")).toBe("01/11/2020");
      expect(toNormalizedPivotValue(dimension, "01/11/2020")).toBe("01/11/2020");
      expect(toNormalizedPivotValue(dimension, "11/2020")).toBe("11/01/2020");
      expect(toNormalizedPivotValue(dimension, "1")).toBe("12/31/1899");
      expect(toNormalizedPivotValue(dimension, 1)).toBe("12/31/1899");
      expect(toNormalizedPivotValue(dimension, "false")).toBe(false);
      expect(toNormalizedPivotValue(dimension, false)).toBe(false);
      // week
      dimension.granularity = "week";
      expect(toNormalizedPivotValue(dimension, "11/2020")).toBe("11/2020");
      expect(toNormalizedPivotValue(dimension, "1/2020")).toBe("1/2020");
      expect(toNormalizedPivotValue(dimension, "01/2020")).toBe("1/2020");
      expect(toNormalizedPivotValue(dimension, "false")).toBe(false);
      expect(toNormalizedPivotValue(dimension, false)).toBe(false);
      // month
      dimension.granularity = "month";
      expect(toNormalizedPivotValue(dimension, "11/2020")).toBe("11/2020");
      expect(toNormalizedPivotValue(dimension, "1/2020")).toBe("01/2020");
      expect(toNormalizedPivotValue(dimension, "01/2020")).toBe("01/2020");
      expect(toNormalizedPivotValue(dimension, "2/11/2020")).toBe("02/2020");
      expect(toNormalizedPivotValue(dimension, "2/1/2020")).toBe("02/2020");
      expect(toNormalizedPivotValue(dimension, 1)).toBe("12/1899");
      expect(toNormalizedPivotValue(dimension, "false")).toBe(false);
      expect(toNormalizedPivotValue(dimension, false)).toBe(false);
      // year
      dimension.granularity = "year";
      expect(toNormalizedPivotValue(dimension, "2020")).toBe(2020);
      expect(toNormalizedPivotValue(dimension, 2020)).toBe(2020);
      expect(toNormalizedPivotValue(dimension, "false")).toBe(false);
      expect(toNormalizedPivotValue(dimension, false)).toBe(false);

      dimension.granularity = "month";
      expect(() => toNormalizedPivotValue(dimension, "true")).toThrow();
      expect(() => toNormalizedPivotValue(dimension, true)).toThrow();
      expect(() => toNormalizedPivotValue(dimension, "won")).toThrow();
    }
  });

  test("parse values of boolean field", () => {
    const dimension = {
      type: "boolean",
      displayName: "A field",
      name: "field_name",
    };
    expect(toNormalizedPivotValue(dimension, "false")).toBe(false);
    expect(toNormalizedPivotValue(dimension, false)).toBe(false);
    expect(toNormalizedPivotValue(dimension, "true")).toBe(true);
    expect(toNormalizedPivotValue(dimension, true)).toBe(true);
    expect(() => toNormalizedPivotValue(dimension, "11/2020")).toThrow();
    expect(() => toNormalizedPivotValue(dimension, "2020")).toThrow();
    expect(() => toNormalizedPivotValue(dimension, "01/11/2020")).toThrow();
    expect(() => toNormalizedPivotValue(dimension, "1")).toThrow();
    expect(() => toNormalizedPivotValue(dimension, 1)).toThrow();
    expect(() => toNormalizedPivotValue(dimension, "won")).toThrow();
  });

  test("parse values of numeric fields", () => {
    const dimension = {
      type: "integer",
      displayName: "A field",
      name: "field_name",
    };
    expect(toNormalizedPivotValue(dimension, "2020")).toBe(2020);
    expect(toNormalizedPivotValue(dimension, "01/11/2020")).toBe(43841); // a date is actually a number in a spreadsheet
    expect(toNormalizedPivotValue(dimension, "11/2020")).toBe(44136); // 1st of november 2020
    expect(toNormalizedPivotValue(dimension, "1")).toBe(1);
    expect(toNormalizedPivotValue(dimension, 1)).toBe(1);
    expect(toNormalizedPivotValue(dimension, "false")).toBe(false);
    expect(toNormalizedPivotValue(dimension, false)).toBe(false);
    expect(() => toNormalizedPivotValue(dimension, "true")).toThrow();
    expect(() => toNormalizedPivotValue(dimension, true)).toThrow();
    expect(() => toNormalizedPivotValue(dimension, "won")).toThrow();
  });

  test("parse values of unsupported fields", () => {
    for (const fieldType of ["one2many", "binary", "html"]) {
      const dimension = {
        type: fieldType,
        displayName: "A field",
        name: "field_name",
      };
      expect(() => toNormalizedPivotValue(dimension, "false")).toThrow();
      expect(() => toNormalizedPivotValue(dimension, false)).toThrow();
      expect(() => toNormalizedPivotValue(dimension, "true")).toThrow();
      expect(() => toNormalizedPivotValue(dimension, true)).toThrow();
      expect(() => toNormalizedPivotValue(dimension, "11/2020")).toThrow();
      expect(() => toNormalizedPivotValue(dimension, "2020")).toThrow();
      expect(() => toNormalizedPivotValue(dimension, "01/11/2020")).toThrow();
      expect(() => toNormalizedPivotValue(dimension, "1")).toThrow();
      expect(() => toNormalizedPivotValue(dimension, 1)).toThrow();
      expect(() => toNormalizedPivotValue(dimension, "won")).toThrow();
    }
  });
});
