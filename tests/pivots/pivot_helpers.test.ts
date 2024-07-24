// import { tokenize } from "../../src";
import { tokenize } from "../../src/formulas";
import {
  getFirstPivotFunction,
  getNumberOfPivotFunctions,
} from "../../src/helpers/pivot/pivot_composer_helpers";
import {
  toFunctionPivotValue,
  toNormalizedPivotValue,
} from "../../src/helpers/pivot/pivot_helpers";
import { pivotTimeAdapter } from "../../src/helpers/pivot/pivot_time_adapter";
import { setDefaultTranslationMethod } from "../../src/translation";
import { DEFAULT_LOCALE } from "../../src/types";

function stringArg(value: string) {
  return { type: "STRING", value: `${value}` };
}

setDefaultTranslationMethod();

describe("Extract pivot function from formula", () => {
  test("Formula extractor", async function () {
    const formula = `=PIVOT.VALUE("1", "test")`;
    const tokens = tokenize(formula);
    let functionName;
    let args;
    ({ functionName, args } = getFirstPivotFunction(tokens));
    expect(functionName).toBe("PIVOT.VALUE");
    expect(args.length).toBe(2);
    expect(args[0]).toEqual(stringArg("1"));
    expect(args[1]).toEqual(stringArg("test"));
  });

  test("Extraction with two PIVOT formulas", async function () {
    const formula = `=PIVOT.VALUE("1", "test") + PIVOT.VALUE("2", "hello", "bla")`;
    const tokens = tokenize(formula);
    const { functionName, args } = getFirstPivotFunction(tokens);
    expect(functionName).toBe("PIVOT.VALUE");
    expect(args.length).toBe(2);
    expect(args[0]).toEqual(stringArg("1"));
    expect(args[1]).toEqual(stringArg("test"));
  });

  test("Number of formulas", async function () {
    const formula = `=PIVOT.VALUE("1", "test") + PIVOT.VALUE("2", "hello", "bla") + ODOO.LIST("1", "bla")`;
    expect(getNumberOfPivotFunctions(tokenize(formula))).toBe(2);
    expect(getNumberOfPivotFunctions(tokenize("=1+1"))).toBe(0);
    expect(getNumberOfPivotFunctions(tokenize("=bla"))).toBe(0);
  });

  test("getFirstPivotFunction does not crash when given crap", async function () {
    expect(getFirstPivotFunction(tokenize("=SUM(A1)"))).toBe(undefined);
    expect(getFirstPivotFunction(tokenize("=1+1"))).toBe(undefined);
    expect(getFirstPivotFunction(tokenize("=bla"))).toBe(undefined);
    expect(getFirstPivotFunction(tokenize("bla"))).toBe(undefined);
  });
});

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
      expect(toNormalizedPivotValue(dimension, "1/11/2020")).toBe(43841);
      expect(toNormalizedPivotValue(dimension, "01/11/2020")).toBe(43841);
      expect(toNormalizedPivotValue(dimension, "11/2020")).toBe(44136);
      expect(toNormalizedPivotValue(dimension, "1")).toBe(1);
      expect(toNormalizedPivotValue(dimension, 1)).toBe(1);
      expect(toNormalizedPivotValue(dimension, "false")).toBe(false);
      expect(toNormalizedPivotValue(dimension, false)).toBe(false);

      // year
      dimension.granularity = "year";
      expect(toNormalizedPivotValue(dimension, "2020")).toBe(2020);
      expect(toNormalizedPivotValue(dimension, 2020)).toBe(2020);
      expect(toNormalizedPivotValue(dimension, "false")).toBe(false);
      expect(toNormalizedPivotValue(dimension, false)).toBe(false);

      dimension.granularity = "day_of_month";
      expect(toNormalizedPivotValue(dimension, "1")).toBe(1);
      expect(toNormalizedPivotValue(dimension, 1)).toBe(1);
      expect(toNormalizedPivotValue(dimension, 31)).toBe(31);
      expect(toNormalizedPivotValue(dimension, "false")).toBe(false);
      expect(toNormalizedPivotValue(dimension, false)).toBe(false);
      expect(toNormalizedPivotValue(dimension, null)).toBe(null);
      expect(() => toNormalizedPivotValue(dimension, 0)).toThrow(
        "0 is not a valid day of month (it should be a number between 1 and 31)"
      );
      expect(() => toNormalizedPivotValue(dimension, 32)).toThrow(
        "32 is not a valid day of month (it should be a number between 1 and 31)"
      );

      dimension.granularity = "iso_week_number";
      expect(toNormalizedPivotValue(dimension, "1")).toBe(1);
      expect(toNormalizedPivotValue(dimension, 1)).toBe(1);
      expect(toNormalizedPivotValue(dimension, 53)).toBe(53);
      expect(toNormalizedPivotValue(dimension, "false")).toBe(false);
      expect(toNormalizedPivotValue(dimension, false)).toBe(false);
      expect(toNormalizedPivotValue(dimension, null)).toBe(null);
      expect(() => toNormalizedPivotValue(dimension, -1)).toThrow(
        "-1 is not a valid week (it should be a number between 0 and 53)"
      );
      expect(() => toNormalizedPivotValue(dimension, 54)).toThrow(
        "54 is not a valid week (it should be a number between 0 and 53)"
      );

      dimension.granularity = "month_number";
      expect(toNormalizedPivotValue(dimension, "1")).toBe(1);
      expect(toNormalizedPivotValue(dimension, 1)).toBe(1);
      expect(toNormalizedPivotValue(dimension, 12)).toBe(12);
      expect(toNormalizedPivotValue(dimension, "false")).toBe(false);
      expect(toNormalizedPivotValue(dimension, false)).toBe(false);
      expect(toNormalizedPivotValue(dimension, null)).toBe(null);
      expect(() => toNormalizedPivotValue(dimension, 0)).toThrow(
        "0 is not a valid month (it should be a number between 1 and 12)"
      );
      expect(() => toNormalizedPivotValue(dimension, 13)).toThrow(
        "13 is not a valid month (it should be a number between 1 and 12)"
      );

      dimension.granularity = "quarter_number";
      expect(toNormalizedPivotValue(dimension, "1")).toBe(1);
      expect(toNormalizedPivotValue(dimension, 1)).toBe(1);
      expect(toNormalizedPivotValue(dimension, 4)).toBe(4);
      expect(toNormalizedPivotValue(dimension, "false")).toBe(false);
      expect(toNormalizedPivotValue(dimension, false)).toBe(false);
      expect(toNormalizedPivotValue(dimension, null)).toBe(null);
      expect(() => toNormalizedPivotValue(dimension, 0)).toThrow(
        "0 is not a valid quarter (it should be a number between 1 and 4)"
      );
      expect(() => toNormalizedPivotValue(dimension, 5)).toThrow(
        "5 is not a valid quarter (it should be a number between 1 and 4)"
      );
    }
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
    const dimension = {
      type: "random type",
      displayName: "A field",
      name: "field_name",
    };
    expect(() => toNormalizedPivotValue(dimension, "false")).toThrow(
      "Field A field is not supported because of its type (random type)"
    );
    expect(() => toNormalizedPivotValue(dimension, false)).toThrow();
    expect(() => toNormalizedPivotValue(dimension, "true")).toThrow();
    expect(() => toNormalizedPivotValue(dimension, true)).toThrow();
    expect(() => toNormalizedPivotValue(dimension, "11/2020")).toThrow();
    expect(() => toNormalizedPivotValue(dimension, "2020")).toThrow();
    expect(() => toNormalizedPivotValue(dimension, "01/11/2020")).toThrow();
    expect(() => toNormalizedPivotValue(dimension, "1")).toThrow();
    expect(() => toNormalizedPivotValue(dimension, 1)).toThrow();
    expect(() => toNormalizedPivotValue(dimension, "won")).toThrow();
  });
});

describe("ToFunctionValue", () => {
  test("Format values of char field", () => {
    const dimension = { type: "char" };
    expect(toFunctionPivotValue("won", dimension)).toBe(`"won"`);
    expect(toFunctionPivotValue("1", dimension)).toBe(`"1"`);
    expect(toFunctionPivotValue(1, dimension)).toBe(`"1"`);
    expect(toFunctionPivotValue("11/2020", dimension)).toBe(`"11/2020"`);
    expect(toFunctionPivotValue("2020", dimension)).toBe(`"2020"`);
    expect(toFunctionPivotValue("01/11/2020", dimension)).toBe(`"01/11/2020"`);
    expect(toFunctionPivotValue("false", dimension)).toBe(`"false"`);
    expect(toFunctionPivotValue(false, dimension)).toBe(`"FALSE"`);
    expect(toFunctionPivotValue("true", dimension)).toBe(`"true"`);
  });

  test("Format values of number field", () => {
    const dimension = { type: "integer" };
    expect(() => toFunctionPivotValue("won", dimension)).toThrow();
    expect(toFunctionPivotValue("1", dimension)).toBe("1");
    expect(toFunctionPivotValue(1, dimension)).toBe("1");
    expect(toFunctionPivotValue("11/2020", dimension)).toBe("44136");
    expect(toFunctionPivotValue("2020", dimension)).toBe("2020");
    expect(toFunctionPivotValue("01/11/2020", dimension)).toBe("43841");
    expect(() => toFunctionPivotValue("false", dimension)).toThrow();
    expect(toFunctionPivotValue(false, dimension)).toBe("0");
    expect(() => toFunctionPivotValue("true", dimension)).toThrow();
  });

  test.each(["date", "datetime"])("Format values of %s fields", (type: string) => {
    const dimension = { type, granularity: "day" };
    // day
    expect(toFunctionPivotValue("1/11/2020", dimension)).toBe(`"01/11/2020"`);
    // year
    dimension.granularity = "year";
    expect(toFunctionPivotValue("2020", dimension)).toBe("2020");

    dimension.granularity = "day_of_month";
    expect(toFunctionPivotValue(1, dimension)).toBe("1");

    dimension.granularity = "iso_week_number";
    expect(toFunctionPivotValue(1, dimension)).toBe("1");

    dimension.granularity = "month_number";
    expect(toFunctionPivotValue(1, dimension)).toBe("1");

    dimension.granularity = "quarter_number";
    expect(toFunctionPivotValue(1, dimension)).toBe("1");
  });

  test("Format values of boolean field", () => {
    const dimension = {
      type: "boolean",
    };
    expect(toFunctionPivotValue("false", dimension)).toBe("FALSE");
    expect(toFunctionPivotValue(false, dimension)).toBe("FALSE");
    expect(toFunctionPivotValue("true", dimension)).toBe("TRUE");
    expect(toFunctionPivotValue(true, dimension)).toBe("TRUE");
  });
});

describe("pivot time adapters formatted value", () => {
  test("Day adapter", () => {
    const adapter = pivotTimeAdapter("day");
    expect(adapter.toValueAndFormat("11/12/2020", DEFAULT_LOCALE)).toEqual({
      value: 44147,
      format: "m/d/yyyy",
    });
    expect(adapter.toValueAndFormat("01/11/2020", DEFAULT_LOCALE)).toEqual({
      value: 43841,
      format: "m/d/yyyy",
    });
    expect(adapter.toValueAndFormat("12/05/2020", DEFAULT_LOCALE)).toEqual({
      value: 44170,
      format: "m/d/yyyy",
    });
  });

  test("Year adapter", () => {
    const adapter = pivotTimeAdapter("year");
    expect(adapter.toValueAndFormat("2020", DEFAULT_LOCALE)).toEqual({
      value: 2020,
      format: "0",
    });
    expect(adapter.toValueAndFormat("1997", DEFAULT_LOCALE)).toEqual({
      value: 1997,
      format: "0",
    });
  });

  test("Day of month", () => {
    const adapter = pivotTimeAdapter("day_of_month");
    expect(adapter.toValueAndFormat("1", DEFAULT_LOCALE)).toEqual({ value: 1, format: "0" });
  });

  test("ISO week number", () => {
    const adapter = pivotTimeAdapter("iso_week_number");
    expect(adapter.toValueAndFormat("1", DEFAULT_LOCALE)).toEqual({ value: 1, format: "0" });
  });

  test("Month number", () => {
    const adapter = pivotTimeAdapter("month_number");
    expect(adapter.toValueAndFormat("1", DEFAULT_LOCALE)).toEqual({
      value: "January",
      format: "0",
    });
  });

  test("Quarter number", () => {
    const adapter = pivotTimeAdapter("quarter_number");
    expect(adapter.toValueAndFormat("1", DEFAULT_LOCALE)).toEqual({ value: "Q1", format: "0" });
  });
});
