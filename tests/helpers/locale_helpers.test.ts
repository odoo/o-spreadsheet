import {
  canonicalizeCFRule,
  canonicalizeContent,
  localizeCFRule,
  localizeContent,
} from "../../src/helpers/locale";
import {
  CellIsRule,
  ColorScaleRule,
  ConditionalFormattingOperatorValues,
  IconSetRule,
} from "../../src/types";
import { FR_LOCALE } from "./../test_helpers/constants";

describe("Locale helpers", () => {
  describe("canonicalize content", () => {
    test("Can canonicalize literal", () => {
      expect(canonicalizeContent("1", FR_LOCALE)).toBe("1");
      expect(canonicalizeContent("1,1", FR_LOCALE)).toBe("1.1");
      expect(canonicalizeContent("1 000,1", FR_LOCALE)).toBe("1000.1");
      expect(canonicalizeContent("1 000 000,1", FR_LOCALE)).toBe("1000000.1");
      expect(canonicalizeContent("1.000,1", { ...FR_LOCALE, thousandsSeparator: "." })).toBe(
        "1000.1"
      );
      expect(canonicalizeContent(",1", FR_LOCALE)).toBe(".1");
      expect(canonicalizeContent("1,", FR_LOCALE)).toBe("1.");
      expect(canonicalizeContent("1,1%", FR_LOCALE)).toBe("1.1%");
      expect(canonicalizeContent("$1,1", FR_LOCALE)).toBe("$1.1");
      expect(canonicalizeContent("01/10/2022", FR_LOCALE)).toBe("10/1/2022");
      expect(canonicalizeContent("01/10/2022 10:00:00", FR_LOCALE)).toBe("10/1/2022 10:00:00 AM");
      expect(canonicalizeContent("01-10-2022", FR_LOCALE)).toBe("10/1/2022");

      expect(
        canonicalizeContent("1000000,1", { ...FR_LOCALE, thousandsSeparator: undefined })
      ).toBe("1000000.1");
    });

    test("Non-number literals aren't canonicalize", () => {
      expect(canonicalizeContent("1,1aa", FR_LOCALE)).toBe("1,1aa");
      expect(canonicalizeContent("Smile ! :) 1,6", FR_LOCALE)).toBe("Smile ! :) 1,6");
    });

    test("Can canonicalize formula", () => {
      expect(canonicalizeContent("=1", FR_LOCALE)).toBe("=1");
      expect(canonicalizeContent("=1,1", FR_LOCALE)).toBe("=1.1");
      expect(canonicalizeContent("=,1", FR_LOCALE)).toBe("=.1");
      expect(canonicalizeContent("=1,", FR_LOCALE)).toBe("=1.");
      expect(canonicalizeContent("=1,1%", FR_LOCALE)).toBe("=1.1%");
      expect(canonicalizeContent("=SUM(1,1)", FR_LOCALE)).toBe("=SUM(1.1)");
      expect(canonicalizeContent("=SUM(1,1; 3)", FR_LOCALE)).toBe("=SUM(1.1, 3)");
      expect(canonicalizeContent("={1;2\\3;4}", FR_LOCALE)).toBe("={1,2;3,4}");
    });

    test("Strings in formulas aren't canonicalized", () => {
      expect(canonicalizeContent('="1,1"', FR_LOCALE)).toBe('="1,1"');
      expect(canonicalizeContent('="1,1 olé"', FR_LOCALE)).toBe('="1,1 olé"');
    });
  });

  describe("Localize content", () => {
    test("Can localize literal", () => {
      expect(localizeContent("1", FR_LOCALE)).toBe("1");
      expect(localizeContent("1.1", FR_LOCALE)).toBe("1,1");
      expect(localizeContent("1.1%", FR_LOCALE)).toBe("1,1%");
      expect(localizeContent("$1.1", FR_LOCALE)).toBe("$1,1");
      expect(localizeContent("10/1/2022", FR_LOCALE)).toBe("01/10/2022");
      expect(localizeContent("10/1/2022 10:00:00", FR_LOCALE)).toBe("01/10/2022 10:00:00");
      expect(localizeContent("10-1-2022", FR_LOCALE)).toBe("01/10/2022");
    });

    test("Non-number literals aren't localized", () => {
      expect(localizeContent("1.1aa", FR_LOCALE)).toBe("1.1aa");
      expect(localizeContent("Smile ! :) 1.6", FR_LOCALE)).toBe("Smile ! :) 1.6");
    });

    test("Can localize formula", () => {
      expect(localizeContent("=1", FR_LOCALE)).toBe("=1");
      expect(localizeContent("=1.1", FR_LOCALE)).toBe("=1,1");
      expect(localizeContent("=1.1%", FR_LOCALE)).toBe("=1,1%");
      expect(localizeContent("=SUM(1.1)", FR_LOCALE)).toBe("=SUM(1,1)");
      expect(localizeContent("=SUM(1.1, 3)", FR_LOCALE)).toBe("=SUM(1,1; 3)");
      expect(localizeContent("={1,2;3,4}", FR_LOCALE)).toBe("={1;2\\3;4}");
    });

    test("Strings in formulas aren't localized", () => {
      expect(localizeContent('="1.1"', FR_LOCALE)).toBe('="1.1"');
      expect(localizeContent('="1.1 olé"', FR_LOCALE)).toBe('="1.1 olé"');
    });
  });

  describe("Localize and canonicalize conditional formats (CFs)", () => {
    const style = { fillColor: "#FF0000" };

    test.each([
      "isBetween",
      "isEqual",
      "isGreaterThan",
      "isGreaterOrEqualTo",
      "isLessThan",
      "isLessOrEqualTo",
      "isNotBetween",
      "isNotEqual",
    ])("CellIsRule can be localized/canonicalized for number operators", (operator) => {
      const rule: CellIsRule = {
        values: ["1.5"],
        operator: operator as ConditionalFormattingOperatorValues,
        type: "CellIsRule",
        style,
      };

      const localized = localizeCFRule(rule, FR_LOCALE);
      expect(localized).toMatchObject({ values: ["1,5"] });

      const canonicalized = canonicalizeCFRule(localized, FR_LOCALE);
      expect(canonicalized).toMatchObject({ values: ["1.5"] });
    });

    test.each(["beginsWithText", "containsText", "endsWithText", "notContainsText"])(
      "CellIsRule values aren't touched for text operators",
      (operator) => {
        const rule: CellIsRule = {
          values: ["1.5"],
          operator: operator as ConditionalFormattingOperatorValues,
          type: "CellIsRule",
          style,
        };

        const localized = localizeCFRule(rule, FR_LOCALE);
        expect(localized).toMatchObject({ values: ["1.5"] });
      }
    );

    test("ColorScale rule can be localized/canonicalized", () => {
      const rule: ColorScaleRule = {
        type: "ColorScaleRule",
        maximum: { type: "formula", color: 0xff00ff, value: "SUM(5.6, 3)" },
        midpoint: { type: "number", color: 0x0000ff, value: "5.6" },
        minimum: { type: "percentage", color: 0x00ff00, value: "9.4" },
      };

      const localized = localizeCFRule(rule, FR_LOCALE);
      expect(localized).toMatchObject({
        maximum: { value: "SUM(5,6; 3)" },
        midpoint: { value: "5,6" },
        minimum: { value: "9,4" },
      });

      const canonicalized = canonicalizeCFRule(localized, FR_LOCALE);
      expect(canonicalized).toMatchObject({
        maximum: { value: "SUM(5.6, 3)" },
        midpoint: { value: "5.6" },
        minimum: { value: "9.4" },
      });
    });

    test("IconSet rule can be localized/canonicalized", () => {
      const rule: IconSetRule = {
        type: "IconSetRule",
        icons: { lower: "RedCircle", middle: "YellowCircle", upper: "GreenCircle" },
        upperInflectionPoint: { type: "number", value: "9.4", operator: "gt" },
        lowerInflectionPoint: { type: "formula", value: "=SUM(8.9, 9.8)", operator: "gt" },
      };

      const localized = localizeCFRule(rule, FR_LOCALE);
      expect(localized).toMatchObject({
        upperInflectionPoint: { value: "9,4" },
        lowerInflectionPoint: { value: "=SUM(8,9; 9,8)" },
      });

      const canonicalized = canonicalizeCFRule(localized, FR_LOCALE);
      expect(canonicalized).toMatchObject({
        upperInflectionPoint: { value: "9.4" },
        lowerInflectionPoint: { value: "=SUM(8.9, 9.8)" },
      });
    });
  });
});
