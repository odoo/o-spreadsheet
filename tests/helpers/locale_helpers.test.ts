import { canonicalizeContent, localizeContent } from "../../src/helpers/locale";
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
});
