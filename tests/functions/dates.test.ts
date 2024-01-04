import { DateTime, parseDateTime } from "../../src/helpers/dates";
import { DEFAULT_LOCALE } from "../../src/types";

const CURRENT_YEAR = DateTime.now().getFullYear();
const locale = DEFAULT_LOCALE;

// -----------------------------------------------------------------------------
// Test on date
// -----------------------------------------------------------------------------

describe("date helpers: can detect and parse various dates", () => {
  test("can properly convert various dates in a large time span", () => {
    expect(parseDateTime("1/1/1000", locale)!.value).toBe(-328716);
    expect(parseDateTime("1/1/2000", locale)!.value).toBe(36526);
    expect(parseDateTime("1/1/3000", locale)!.value).toBe(401769);
    expect(parseDateTime("1/1/4000", locale)!.value).toBe(767011);
  });

  test("parse various dates in m/d/yyyy format", () => {
    expect(parseDateTime("12/30/1899", locale)).toEqual({
      value: 0,
      format: "m/d/yyyy",
      jsDate: new DateTime(1899, 11, 30),
    });
    expect(parseDateTime("12/31/1899", locale)).toEqual({
      value: 1,
      format: "m/d/yyyy",
      jsDate: new DateTime(1899, 11, 31),
    });
    expect(parseDateTime("1/1/1900", locale)).toEqual({
      value: 2,
      format: "m/d/yyyy",
      jsDate: new DateTime(1900, 0, 1),
    });
    expect(parseDateTime("4/20/2020", locale)).toEqual({
      value: 43941,
      format: "m/d/yyyy",
      jsDate: new DateTime(2020, 3, 20),
    });
  });

  test("parse various dates in yyyy/m/d format", () => {
    expect(parseDateTime("1899/12/30", locale)).toEqual({
      value: 0,
      format: "yyyy/m/d",
      jsDate: new DateTime(1899, 11, 30),
    });
    expect(parseDateTime("1899/12/31", locale)).toEqual({
      value: 1,
      format: "yyyy/m/d",
      jsDate: new DateTime(1899, 11, 31),
    });
    expect(parseDateTime("1900/1/1", locale)).toEqual({
      value: 2,
      format: "yyyy/m/d",
      jsDate: new DateTime(1900, 0, 1),
    });
    expect(parseDateTime("2020/4/20", locale)).toEqual({
      value: 43941,
      format: "yyyy/m/d",
      jsDate: new DateTime(2020, 3, 20),
    });
  });

  test("can detect and parse mm/dd/yyyy dates ", () => {
    expect(parseDateTime("03/20/2010", locale)).toEqual({
      value: 40257,
      format: "mm/dd/yyyy",
      jsDate: new DateTime(2010, 2, 20),
    });
    expect(parseDateTime("10/03/2010", locale)).toEqual({
      value: 40454,
      format: "mm/dd/yyyy",
      jsDate: new DateTime(2010, 9, 3),
    });
  });

  test("can detect and parse yyyy/mm/dd dates ", () => {
    expect(parseDateTime("2010/03/20", locale)).toEqual({
      value: 40257,
      format: "yyyy/mm/dd",
      jsDate: new DateTime(2010, 2, 20),
    });
    expect(parseDateTime("2010/10/03", locale)).toEqual({
      value: 40454,
      format: "yyyy/mm/dd",
      jsDate: new DateTime(2010, 9, 3),
    });
  });

  test("can detect and parse m/d and mm/dd dates ", () => {
    const d1 = parseDateTime("1/3", locale)!;
    expect(d1.jsDate!).toEqual(new DateTime(CURRENT_YEAR, 0, 3));
    expect(d1.format).toBe("m/d");

    const d2 = parseDateTime("1/03", locale)!;
    expect(d2.jsDate!).toEqual(new DateTime(CURRENT_YEAR, 0, 3));
    expect(d2.format).toBe("mm/dd");
  });

  test("can detect and parse m/yyyy and mm/yyy dates ", () => {
    const d1 = parseDateTime("3/2023", locale)!;
    expect(d1.jsDate!).toEqual(new DateTime(2023, 2, 1));
    expect(d1.format).toBe("m/yyyy");

    const d2 = parseDateTime("03/2023", locale)!;
    expect(d2.jsDate!).toEqual(new DateTime(2023, 2, 1));
    expect(d2.format).toBe("mm/yyyy");
  });

  test("can detect and parse m-d-yyyy dates ", () => {
    expect(parseDateTime("3-2-2010", locale)).toEqual({
      value: 40239,
      format: "m-d-yyyy",
      jsDate: new DateTime(2010, 2, 2),
    });
    expect(parseDateTime("10-23-2010", locale)).toEqual({
      value: 40474,
      format: "m-d-yyyy",
      jsDate: new DateTime(2010, 9, 23),
    });
  });

  test("can detect and parse yyyy-m-d dates ", () => {
    expect(parseDateTime("2010-3-2", locale)).toEqual({
      value: 40239,
      format: "yyyy-m-d",
      jsDate: new DateTime(2010, 2, 2),
    });
    expect(parseDateTime("2010-10-23", locale)).toEqual({
      value: 40474,
      format: "yyyy-m-d",
      jsDate: new DateTime(2010, 9, 23),
    });
  });

  test("can detect and parse yyyy-mm-dd dates ", () => {
    expect(parseDateTime("2010-03-20", locale)).toEqual({
      value: 40257,
      format: "yyyy-mm-dd",
      jsDate: new DateTime(2010, 2, 20),
    });
    expect(parseDateTime("2010-10-03", locale)).toEqual({
      value: 40454,
      format: "yyyy-mm-dd",
      jsDate: new DateTime(2010, 9, 3),
    });
  });

  test("can detect and parse m-d and mm-dd dates ", () => {
    const d1 = parseDateTime("1-3", locale)!;
    expect(d1.jsDate!).toEqual(new DateTime(CURRENT_YEAR, 0, 3));
    expect(d1.format).toBe("m-d");

    const d2 = parseDateTime("1-03", locale)!;
    expect(d2.jsDate!).toEqual(new DateTime(CURRENT_YEAR, 0, 3));
    expect(d2.format).toBe("mm-dd");
  });

  test("can detect and parse m-yyyy and mm-yyy dates ", () => {
    const d1 = parseDateTime("3-2023", locale)!;
    expect(d1.jsDate!).toEqual(new DateTime(2023, 2, 1));
    expect(d1.format).toBe("m-yyyy");

    const d2 = parseDateTime("03-2023", locale)!;
    expect(d2.jsDate!).toEqual(new DateTime(2023, 2, 1));
    expect(d2.format).toBe("mm-yyyy");
  });

  test('can detect and parse "mm dd yyyy" dates ', () => {
    expect(parseDateTime("03 20 2010", locale)).toEqual({
      value: 40257,
      format: "mm dd yyyy",
      jsDate: new DateTime(2010, 2, 20),
    });
    expect(parseDateTime("10 03 2010", locale)).toEqual({
      value: 40454,
      format: "mm dd yyyy",
      jsDate: new DateTime(2010, 9, 3),
    });
  });

  test('can detect and parse "yyyy mm dd" dates ', () => {
    expect(parseDateTime("2010 03 20", locale)).toEqual({
      value: 40257,
      format: "yyyy mm dd",
      jsDate: new DateTime(2010, 2, 20),
    });
    expect(parseDateTime("2010 10 03", locale)).toEqual({
      value: 40454,
      format: "yyyy mm dd",
      jsDate: new DateTime(2010, 9, 3),
    });
  });

  test("can detect and parse 'm d' and 'mm dd' dates ", () => {
    const d1 = parseDateTime("1 3", locale)!;
    expect(d1.jsDate!).toEqual(new DateTime(CURRENT_YEAR, 0, 3));
    expect(d1.format).toBe("m d");

    const d2 = parseDateTime("1 03", locale)!;
    expect(d2.jsDate!).toEqual(new DateTime(CURRENT_YEAR, 0, 3));
    expect(d2.format).toBe("mm dd");
  });

  test("can detect and parse 'm yyyy' and 'mm yyyy' dates ", () => {
    const d1 = parseDateTime("3 2023", locale)!;
    expect(d1.jsDate!).toEqual(new DateTime(2023, 2, 1));
    expect(d1.format).toBe("m yyyy");

    const d2 = parseDateTime("03 2023", locale)!;
    expect(d2.jsDate!).toEqual(new DateTime(2023, 2, 1));
    expect(d2.format).toBe("mm yyyy");
  });

  test("does not parse invalid dates", () => {
    expect(parseDateTime("100/100/2099", locale)).toBeNull();
    expect(parseDateTime("20/10/2020", locale)).toBeNull(); // 20 is not a valid month
    expect(parseDateTime("02/29/2020", locale)).not.toBeNull();
    expect(parseDateTime("02/30/2020", locale)).toBeNull();
    expect(parseDateTime("02/28/2021", locale)).not.toBeNull();
    expect(parseDateTime("02/29/2021", locale)).toBeNull();
    expect(parseDateTime("01/33/2021", locale)).toBeNull();
    expect(parseDateTime("01/2023/01", locale)).toBeNull();
    expect(parseDateTime("01/2023/2023", locale)).toBeNull();
    expect(parseDateTime("13/2023", locale)).toBeNull();
    expect(parseDateTime("0/2023", locale)).toBeNull();
    expect(parseDateTime("-1/2023", locale)).toBeNull();
  });

  test("can infer a year if not given completely", () => {
    const getYear = (str) => parseDateTime(str, locale)!.jsDate!.getFullYear();

    expect(getYear("1/1/0")).toBe(2000);
    expect(getYear("1/1/8")).toBe(2008);
    expect(getYear("1/1/12")).toBe(2012);

    expect(getYear(`1/1/${CURRENT_YEAR - 2000 + 9}`)).toBe(CURRENT_YEAR + 9);
    expect(getYear(`1/1/${CURRENT_YEAR - 2000 + 10}`)).toBe(CURRENT_YEAR + 10);
    expect(getYear(`1/1/${CURRENT_YEAR - 2000 + 11}`)).toBe(CURRENT_YEAR + 11 - 100);
  });

  test("refuse various strings", () => {
    expect(parseDateTime("1/1/1920/3", locale)).toBe(null);
    expect(parseDateTime("1.2/10/2020", locale)).toBe(null);
  });
});

// -----------------------------------------------------------------------------
// Test on time
// -----------------------------------------------------------------------------

describe("date helpers: can detect and parse various times", () => {
  test("can detect and parse 'hh:mm' times", () => {
    expect(parseDateTime("00:00", locale)).toEqual({
      value: 0,
      format: "hh:mm",
      jsDate: new DateTime(1899, 11, 30, 0, 0, 0),
    });
    expect(parseDateTime("6:00", locale)).toEqual({
      value: 0.25,
      format: "hh:mm",
      jsDate: new DateTime(1899, 11, 30, 6, 0, 0),
    });
    expect(parseDateTime("12:09", locale)).toEqual({
      value: 0.50625,
      format: "hh:mm",
      jsDate: new DateTime(1899, 11, 30, 12, 9, 0),
    });
    expect(parseDateTime("12:9", locale)).toEqual({
      // @compatibility: on google sheets, return string
      value: 0.50625,
      format: "hh:mm",
      jsDate: new DateTime(1899, 11, 30, 12, 9, 0),
    });
    expect(parseDateTime("00012:09", locale)).toEqual({
      value: 0.50625,
      format: "hh:mm",
      jsDate: new DateTime(1899, 11, 30, 12, 9, 0),
    });
    expect(parseDateTime("12:00000009", locale)).toEqual({
      value: 0.50625,
      format: "hh:mm",
      jsDate: new DateTime(1899, 11, 30, 12, 9, 0),
    });
    expect(parseDateTime("11:69", locale)).toEqual({
      value: 0.50625,
      format: "hh:mm",
      jsDate: new DateTime(1899, 11, 30, 12, 9, 0),
    });
  });

  test("can detect and parse 'hh:mm:ss' times", () => {
    expect(parseDateTime("12:00:00", locale)).toEqual({
      value: 0.5,
      format: "hh:mm:ss",
      jsDate: new DateTime(1899, 11, 30, 12, 0, 0),
    });
    expect(parseDateTime("12:08:06", locale)).toEqual({
      value: 0.505625,
      format: "hh:mm:ss",
      jsDate: new DateTime(1899, 11, 30, 12, 8, 6),
    });
    expect(parseDateTime("12:8:6", locale)).toEqual({
      value: 0.505625,
      format: "hh:mm:ss",
      jsDate: new DateTime(1899, 11, 30, 12, 8, 6),
    });
    expect(parseDateTime("12:008:006", locale)).toEqual({
      value: 0.505625,
      format: "hh:mm:ss",
      jsDate: new DateTime(1899, 11, 30, 12, 8, 6),
    });
    expect(parseDateTime("11:59:546", locale)).toEqual({
      value: 0.505625,
      format: "hh:mm:ss",
      jsDate: new DateTime(1899, 11, 30, 12, 8, 6),
    });
  });

  test("can detect and parse 'hh:mm a' times", () => {
    expect(parseDateTime("0 AM", locale)).toEqual({
      value: 0,
      format: "hh:mm a",
      jsDate: new DateTime(1899, 11, 30, 0, 0, 0),
    });
    expect(parseDateTime("12 AM", locale)).toEqual({
      value: 0,
      format: "hh:mm a",
      jsDate: new DateTime(1899, 11, 30, 0, 0, 0),
    });
    expect(parseDateTime("24 AM", locale)).toEqual({
      // @compatibility: on google sheets, return string
      value: 0.5,
      format: "hh:mm a",
      jsDate: new DateTime(1899, 11, 30, 12, 0, 0),
    });
    expect(parseDateTime("6AM", locale)).toEqual({
      value: 0.25,
      format: "hh:mm a",
      jsDate: new DateTime(1899, 11, 30, 6, 0, 0),
    });
    expect(parseDateTime("6   AM", locale)).toEqual({
      value: 0.25,
      format: "hh:mm a",
      jsDate: new DateTime(1899, 11, 30, 6, 0, 0),
    });

    expect(parseDateTime("0 PM", locale)).toEqual({
      value: 0.5,
      format: "hh:mm a",
      jsDate: new DateTime(1899, 11, 30, 12, 0, 0),
    });
    expect(parseDateTime("12 PM", locale)).toEqual({
      value: 0.5,
      format: "hh:mm a",
      jsDate: new DateTime(1899, 11, 30, 12, 0, 0),
    });
    expect(parseDateTime("6PM", locale)).toEqual({
      value: 0.75,
      format: "hh:mm a",
      jsDate: new DateTime(1899, 11, 30, 18, 0, 0),
    });
    expect(parseDateTime("6   PM", locale)).toEqual({
      value: 0.75,
      format: "hh:mm a",
      jsDate: new DateTime(1899, 11, 30, 18, 0, 0),
    });

    expect(parseDateTime("0:09 AM", locale)).toEqual({
      value: 0.00625,
      format: "hh:mm a",
      jsDate: new DateTime(1899, 11, 30, 0, 9, 0),
    });
    expect(parseDateTime("12:09 AM", locale)).toEqual({
      value: 0.00625,
      format: "hh:mm a",
      jsDate: new DateTime(1899, 11, 30, 0, 9, 0),
    });
    expect(parseDateTime("00012:00000009    AM", locale)).toEqual({
      value: 0.00625,
      format: "hh:mm a",
      jsDate: new DateTime(1899, 11, 30, 0, 9, 0),
    });

    expect(parseDateTime("11:69 AM", locale)).toEqual({
      value: 0.50625,
      format: "hh:mm a",
      jsDate: new DateTime(1899, 11, 30, 12, 9, 0),
    });
    expect(parseDateTime("18:00 AM", locale)).toEqual({
      value: 0.25,
      format: "hh:mm a",
      jsDate: new DateTime(1899, 11, 30, 6, 0, 0),
    });
  });

  test("can detect and parse 'hh:mm:ss a' times", () => {
    expect(parseDateTime("12:00:00 AM", locale)).toEqual({
      value: 0,
      format: "hh:mm:ss a",
      jsDate: new DateTime(1899, 11, 30, 0, 0, 0),
    });
    expect(parseDateTime("00:00:00 AM", locale)).toEqual({
      value: 0,
      format: "hh:mm:ss a",
      jsDate: new DateTime(1899, 11, 30, 0, 0, 0),
    });
    expect(parseDateTime("12:00:00 PM", locale)).toEqual({
      value: 0.5,
      format: "hh:mm:ss a",
      jsDate: new DateTime(1899, 11, 30, 12, 0, 0),
    });
    expect(parseDateTime("0:00:00 PM", locale)).toEqual({
      value: 0.5,
      format: "hh:mm:ss a",
      jsDate: new DateTime(1899, 11, 30, 12, 0, 0),
    });
    expect(parseDateTime("12:08:06 AM", locale)).toEqual({
      value: 0.005625,
      format: "hh:mm:ss a",
      jsDate: new DateTime(1899, 11, 30, 0, 8, 6),
    });
    expect(parseDateTime("12:8:6 AM", locale)).toEqual({
      value: 0.005625,
      format: "hh:mm:ss a",
      jsDate: new DateTime(1899, 11, 30, 0, 8, 6),
    });
    expect(parseDateTime("12:008:006 AM", locale)).toEqual({
      value: 0.005625,
      format: "hh:mm:ss a",
      jsDate: new DateTime(1899, 11, 30, 0, 8, 6),
    });
    expect(parseDateTime("11:59:546   AM", locale)).toEqual({
      value: 0.505625,
      format: "hh:mm:ss a",
      jsDate: new DateTime(1899, 11, 30, 12, 8, 6),
    });
  });

  test("can detect and parse 'hhhh:mm:ss' times", () => {
    expect(parseDateTime("30:00", locale)).toEqual({
      value: 1.25,
      format: "hhhh:mm:ss",
      jsDate: new DateTime(1899, 11, 31, 6, 0, 0),
    });
    expect(parseDateTime("24:08:06", locale)).toEqual({
      value: 1.005625,
      format: "hhhh:mm:ss",
      jsDate: new DateTime(1899, 11, 31, 0, 8, 6),
    });
    expect(parseDateTime("36 AM", locale)).toEqual({
      value: 1,
      format: "hhhh:mm:ss",
      jsDate: new DateTime(1899, 11, 31, 0, 0, 0),
    });
    expect(parseDateTime("24 PM", locale)).toEqual({
      value: 1,
      format: "hhhh:mm:ss",
      jsDate: new DateTime(1899, 11, 31, 0, 0, 0),
    });
    expect(parseDateTime("36:09 AM", locale)).toEqual({
      value: 1.00625,
      format: "hhhh:mm:ss",
      jsDate: new DateTime(1899, 11, 31, 0, 9, 0),
    });
    expect(parseDateTime("23:59:60 PM", locale)).toEqual({
      value: 1,
      format: "hhhh:mm:ss",
      jsDate: new DateTime(1899, 11, 31, 0, 0, 0),
    });
  });
});

// -----------------------------------------------------------------------------
// Test on date and time
// -----------------------------------------------------------------------------

describe("date helpers: can detect and parse various datetimes (with '/' separator)", () => {
  // m/d/yyyy

  test("can detect and parse 'm/d/yyyy hh:mm' datetime", () => {
    expect(parseDateTime("4/20/2020 12:09", locale)).toEqual({
      value: 43941.50625,
      format: "m/d/yyyy hh:mm",
      jsDate: new DateTime(2020, 3, 20, 12, 9, 0),
    });
  });

  test("can detect and parse 'm/d/yyyy hh:mm:ss' datetime", () => {
    expect(parseDateTime("4/20/2020 12:08:06", locale)).toEqual({
      value: 43941.505625,
      format: "m/d/yyyy hh:mm:ss",
      jsDate: new DateTime(2020, 3, 20, 12, 8, 6),
    });
  });

  test("can detect and parse 'm/d/yyyy hh:mm a' datetime", () => {
    expect(parseDateTime("4/20/2020 12:09 AM", locale)).toEqual({
      value: 43941.00625,
      format: "m/d/yyyy hh:mm a",
      jsDate: new DateTime(2020, 3, 20, 0, 9, 0),
    });
    expect(parseDateTime("4/20/2020 6 PM", locale)).toEqual({
      value: 43941.75,
      format: "m/d/yyyy hh:mm a",
      jsDate: new DateTime(2020, 3, 20, 18, 0, 0),
    });
  });

  test("can detect and parse 'm/d/yyyy hh:mm:ss a' datetime", () => {
    expect(parseDateTime("4/20/2020 12:08:06 AM", locale)).toEqual({
      value: 43941.005625,
      format: "m/d/yyyy hh:mm:ss a",
      jsDate: new DateTime(2020, 3, 20, 0, 8, 6),
    });
  });

  // yyyy/m/d

  test("can detect and parse 'yyyy/m/d hh:mm' datetime", () => {
    expect(parseDateTime("2020/4/20 12:09", locale)).toEqual({
      value: 43941.50625,
      format: "yyyy/m/d hh:mm",
      jsDate: new DateTime(2020, 3, 20, 12, 9, 0),
    });
  });

  test("can detect and parse 'yyyy/m/d hh:mm:ss' datetime", () => {
    expect(parseDateTime("2020/4/20 12:08:06", locale)).toEqual({
      value: 43941.505625,
      format: "yyyy/m/d hh:mm:ss",
      jsDate: new DateTime(2020, 3, 20, 12, 8, 6),
    });
  });

  test("can detect and parse 'yyyy/m/d hh:mm a' datetime", () => {
    expect(parseDateTime("2020/4/20 12:09 AM", locale)).toEqual({
      value: 43941.00625,
      format: "yyyy/m/d hh:mm a",
      jsDate: new DateTime(2020, 3, 20, 0, 9, 0),
    });
    expect(parseDateTime("2020/4/20 6 PM", locale)).toEqual({
      value: 43941.75,
      format: "yyyy/m/d hh:mm a",
      jsDate: new DateTime(2020, 3, 20, 18, 0, 0),
    });
  });

  test("can detect and parse 'yyyy/m/d hh:mm:ss a' datetime", () => {
    expect(parseDateTime("2020/4/20 12:08:06 AM", locale)).toEqual({
      value: 43941.005625,
      format: "yyyy/m/d hh:mm:ss a",
      jsDate: new DateTime(2020, 3, 20, 0, 8, 6),
    });
  });

  // mm/dd/yyyy

  test("can detect and parse 'mm/dd/yyyy hh:mm' datetime", () => {
    expect(parseDateTime("03/20/2010 12:09", locale)).toEqual({
      value: 40257.50625,
      format: "mm/dd/yyyy hh:mm",
      jsDate: new DateTime(2010, 2, 20, 12, 9, 0),
    });
  });

  test("can detect and parse 'mm/dd/yyyy hh:mm:ss' datetime", () => {
    expect(parseDateTime("03/20/2010 12:08:06", locale)).toEqual({
      value: 40257.505625,
      format: "mm/dd/yyyy hh:mm:ss",
      jsDate: new DateTime(2010, 2, 20, 12, 8, 6),
    });
  });

  test("can detect and parse 'mm/dd/yyyy hh:mm a' datetime", () => {
    expect(parseDateTime("03/20/2010 12:09 AM", locale)).toEqual({
      value: 40257.00625,
      format: "mm/dd/yyyy hh:mm a",
      jsDate: new DateTime(2010, 2, 20, 0, 9, 0),
    });
    expect(parseDateTime("03/20/2010 6 PM", locale)).toEqual({
      value: 40257.75,

      format: "mm/dd/yyyy hh:mm a",
      jsDate: new DateTime(2010, 2, 20, 18, 0, 0),
    });
  });

  test("can detect and parse 'mm/dd/yyyy hh:mm:ss a' datetime", () => {
    expect(parseDateTime("03/20/2010 12:08:06 AM", locale)).toEqual({
      value: 40257.005625,
      format: "mm/dd/yyyy hh:mm:ss a",
      jsDate: new DateTime(2010, 2, 20, 0, 8, 6),
    });
  });

  // yyyy/mm/dd

  test("can detect and parse 'yyyy/mm/dd hh:mm' datetime", () => {
    expect(parseDateTime("2010/03/20 12:09", locale)).toEqual({
      value: 40257.50625,
      format: "yyyy/mm/dd hh:mm",
      jsDate: new DateTime(2010, 2, 20, 12, 9, 0),
    });
  });

  test("can detect and parse 'yyyy/mm/dd hh:mm:ss' datetime", () => {
    expect(parseDateTime("2010/03/20 12:08:06", locale)).toEqual({
      value: 40257.505625,
      format: "yyyy/mm/dd hh:mm:ss",
      jsDate: new DateTime(2010, 2, 20, 12, 8, 6),
    });
  });

  test("can detect and parse 'yyyy/mm/dd hh:mm a' datetime", () => {
    expect(parseDateTime("2010/03/20 12:09 AM", locale)).toEqual({
      value: 40257.00625,
      format: "yyyy/mm/dd hh:mm a",
      jsDate: new DateTime(2010, 2, 20, 0, 9, 0),
    });
    expect(parseDateTime("2010/03/20 6 PM", locale)).toEqual({
      value: 40257.75,
      format: "yyyy/mm/dd hh:mm a",
      jsDate: new DateTime(2010, 2, 20, 18, 0, 0),
    });
  });

  test("can detect and parse 'yyyy/mm/dd hh:mm:ss a' datetime", () => {
    expect(parseDateTime("2010/03/20 12:08:06 AM", locale)).toEqual({
      value: 40257.005625,
      format: "yyyy/mm/dd hh:mm:ss a",
      jsDate: new DateTime(2010, 2, 20, 0, 8, 6),
    });
  });

  // m/d

  test("can detect and parse 'm/d hh:mm' datetime", () => {
    const d = parseDateTime("1/3 12:09", locale)!;
    expect(d.jsDate).toEqual(new DateTime(CURRENT_YEAR, 0, 3, 12, 9, 0));
    expect(d.format).toBe("m/d hh:mm");
  });

  test("can detect and parse 'm/d hh:mm:ss' datetime", () => {
    const d = parseDateTime("1/3 12:08:06", locale)!;
    expect(d.jsDate).toEqual(new DateTime(CURRENT_YEAR, 0, 3, 12, 8, 6));
    expect(d.format).toBe("m/d hh:mm:ss");
  });

  test("can detect and parse 'm/d hh:mm a' datetime", () => {
    const d1 = parseDateTime("1/3 12:09 AM", locale)!;
    expect(d1.jsDate).toEqual(new DateTime(CURRENT_YEAR, 0, 3, 0, 9, 0));
    expect(d1.format).toBe("m/d hh:mm a");

    const d2 = parseDateTime("1/3 6 PM", locale)!;
    expect(d2.jsDate).toEqual(new DateTime(CURRENT_YEAR, 0, 3, 18, 0, 0));
    expect(d2.format).toBe("m/d hh:mm a");
  });

  test("can detect and parse 'm/d hh:mm:ss a' datetime", () => {
    const d = parseDateTime("1/3 12:08:06 AM", locale)!;
    expect(d.jsDate).toEqual(new DateTime(CURRENT_YEAR, 0, 3, 0, 8, 6));
    expect(d.format).toBe("m/d hh:mm:ss a");
  });

  // mm/dd

  test("can detect and parse 'mm/dd hh:mm' datetime", () => {
    const d = parseDateTime("1/03 12:09", locale)!;
    expect(d.jsDate).toEqual(new DateTime(CURRENT_YEAR, 0, 3, 12, 9, 0));
    expect(d.format).toBe("mm/dd hh:mm");
  });

  test("can detect and parse 'mm/dd hh:mm:ss' datetime", () => {
    const d = parseDateTime("1/03 12:08:06", locale)!;
    expect(d.jsDate).toEqual(new DateTime(CURRENT_YEAR, 0, 3, 12, 8, 6));
    expect(d.format).toBe("mm/dd hh:mm:ss");
  });

  test("can detect and parse 'mm/dd hh:mm a' datetime", () => {
    const d1 = parseDateTime("1/03 12:09 AM", locale)!;
    expect(d1.jsDate).toEqual(new DateTime(CURRENT_YEAR, 0, 3, 0, 9, 0));
    expect(d1.format).toBe("mm/dd hh:mm a");

    const d2 = parseDateTime("1/03 6 PM", locale)!;
    expect(d2.jsDate).toEqual(new DateTime(CURRENT_YEAR, 0, 3, 18, 0, 0));
    expect(d2.format).toBe("mm/dd hh:mm a");
  });

  test("can detect and parse 'mm/dd hh:mm:ss a' datetime", () => {
    const d = parseDateTime("1/03 12:08:06 AM", locale)!;
    expect(d.jsDate).toEqual(new DateTime(CURRENT_YEAR, 0, 3, 0, 8, 6));
    expect(d.format).toBe("mm/dd hh:mm:ss a");
  });
});

describe("date helpers: can detect and parse various datetime (with ' ' separator)", () => {
  // m d yyyy

  test("can detect and parse 'm d yyyy hh:mm' datetime", () => {
    expect(parseDateTime("4 20 2020 12:09", locale)).toEqual({
      value: 43941.50625,
      format: "m d yyyy hh:mm",
      jsDate: new DateTime(2020, 3, 20, 12, 9, 0),
    });
  });

  test("can detect and parse 'm d yyyy hh:mm:ss' datetime", () => {
    expect(parseDateTime("4 20 2020 12:08:06", locale)).toEqual({
      value: 43941.505625,
      format: "m d yyyy hh:mm:ss",
      jsDate: new DateTime(2020, 3, 20, 12, 8, 6),
    });
  });

  test("can detect and parse 'm d yyyy hh:mm a' datetime", () => {
    expect(parseDateTime("4 20 2020 12:09 AM", locale)).toEqual({
      value: 43941.00625,
      format: "m d yyyy hh:mm a",
      jsDate: new DateTime(2020, 3, 20, 0, 9, 0),
    });
    expect(parseDateTime("4 20 2020 6 PM", locale)).toEqual({
      value: 43941.75,
      format: "m d yyyy hh:mm a",
      jsDate: new DateTime(2020, 3, 20, 18, 0, 0),
    });
  });

  test("can detect and parse 'm d yyyy hh:mm:ss a' datetime", () => {
    expect(parseDateTime("4 20 2020 12:08:06 AM", locale)).toEqual({
      value: 43941.005625,
      format: "m d yyyy hh:mm:ss a",
      jsDate: new DateTime(2020, 3, 20, 0, 8, 6),
    });
  });

  // yyyy m d

  test("can detect and parse 'yyyy m d hh:mm' datetime", () => {
    expect(parseDateTime("2020 4 20 12:09", locale)).toEqual({
      value: 43941.50625,
      format: "yyyy m d hh:mm",
      jsDate: new DateTime(2020, 3, 20, 12, 9, 0),
    });
  });

  test("can detect and parse 'yyyy m d hh:mm:ss' datetime", () => {
    expect(parseDateTime("2020 4 20 12:08:06", locale)).toEqual({
      value: 43941.505625,
      format: "yyyy m d hh:mm:ss",
      jsDate: new DateTime(2020, 3, 20, 12, 8, 6),
    });
  });

  test("can detect and parse 'yyyy m d hh:mm a' datetime", () => {
    expect(parseDateTime("2020 4 20 12:09 AM", locale)).toEqual({
      value: 43941.00625,
      format: "yyyy m d hh:mm a",
      jsDate: new DateTime(2020, 3, 20, 0, 9, 0),
    });
    expect(parseDateTime("2020 4 20 6 PM", locale)).toEqual({
      value: 43941.75,
      format: "yyyy m d hh:mm a",
      jsDate: new DateTime(2020, 3, 20, 18, 0, 0),
    });
  });

  test("can detect and parse 'yyyy m d hh:mm:ss a' datetime", () => {
    expect(parseDateTime("2020 4 20 12:08:06 AM", locale)).toEqual({
      value: 43941.005625,
      format: "yyyy m d hh:mm:ss a",
      jsDate: new DateTime(2020, 3, 20, 0, 8, 6),
    });
  });

  // mm dd yyyy

  test("can detect and parse 'mm dd yyyy hh:mm' datetime", () => {
    expect(parseDateTime("03 20 2010 12:09", locale)).toEqual({
      value: 40257.50625,
      format: "mm dd yyyy hh:mm",
      jsDate: new DateTime(2010, 2, 20, 12, 9, 0),
    });
  });

  test("can detect and parse 'mm dd yyyy hh:mm:ss' datetime", () => {
    expect(parseDateTime("03 20 2010 12:08:06", locale)).toEqual({
      value: 40257.505625,
      format: "mm dd yyyy hh:mm:ss",
      jsDate: new DateTime(2010, 2, 20, 12, 8, 6),
    });
  });

  test("can detect and parse 'mm dd yyyy hh:mm a' datetime", () => {
    expect(parseDateTime("03 20 2010 12:09 AM", locale)).toEqual({
      value: 40257.00625,
      format: "mm dd yyyy hh:mm a",
      jsDate: new DateTime(2010, 2, 20, 0, 9, 0),
    });
    expect(parseDateTime("03 20 2010 6 PM", locale)).toEqual({
      value: 40257.75,
      format: "mm dd yyyy hh:mm a",
      jsDate: new DateTime(2010, 2, 20, 18, 0, 0),
    });
  });

  test("can detect and parse 'mm dd yyyy hh:mm:ss a' datetime", () => {
    expect(parseDateTime("03 20 2010 12:08:06 AM", locale)).toEqual({
      value: 40257.005625,
      format: "mm dd yyyy hh:mm:ss a",
      jsDate: new DateTime(2010, 2, 20, 0, 8, 6),
    });
  });

  // yyyy mm dd

  test("can detect and parse 'yyyy mm dd hh:mm' datetime", () => {
    expect(parseDateTime("2010 03 20 12:09", locale)).toEqual({
      value: 40257.50625,
      format: "yyyy mm dd hh:mm",
      jsDate: new DateTime(2010, 2, 20, 12, 9, 0),
    });
  });

  test("can detect and parse 'yyyy mm dd hh:mm:ss' datetime", () => {
    expect(parseDateTime("2010 03 20 12:08:06", locale)).toEqual({
      value: 40257.505625,
      format: "yyyy mm dd hh:mm:ss",
      jsDate: new DateTime(2010, 2, 20, 12, 8, 6),
    });
  });

  test("can detect and parse 'yyyy mm dd hh:mm a' datetime", () => {
    expect(parseDateTime("2010 03 20 12:09 AM", locale)).toEqual({
      value: 40257.00625,
      format: "yyyy mm dd hh:mm a",
      jsDate: new DateTime(2010, 2, 20, 0, 9, 0),
    });
    expect(parseDateTime("2010 03 20 6 PM", locale)).toEqual({
      value: 40257.75,
      format: "yyyy mm dd hh:mm a",
      jsDate: new DateTime(2010, 2, 20, 18, 0, 0),
    });
  });

  test("can detect and parse 'yyyy mm dd hh:mm:ss a' datetime", () => {
    expect(parseDateTime("2010 03 20 12:08:06 AM", locale)).toEqual({
      value: 40257.005625,
      format: "yyyy mm dd hh:mm:ss a",
      jsDate: new DateTime(2010, 2, 20, 0, 8, 6),
    });
  });

  // m d

  test("can detect and parse 'm d hh:mm' datetime", () => {
    const d = parseDateTime("1 3 12:09", locale)!;
    expect(d.jsDate).toEqual(new DateTime(CURRENT_YEAR, 0, 3, 12, 9, 0));
    expect(d.format).toBe("m d hh:mm");
  });

  test("can detect and parse 'm d hh:mm:ss' datetime", () => {
    const d = parseDateTime("1 3 12:08:06", locale)!;
    expect(d.jsDate).toEqual(new DateTime(CURRENT_YEAR, 0, 3, 12, 8, 6));
    expect(d.format).toBe("m d hh:mm:ss");
    const d1 = parseDateTime("1 3 12:09 AM", locale)!;
    expect(d1.jsDate).toEqual(new DateTime(CURRENT_YEAR, 0, 3, 0, 9, 0));
    expect(d1.format).toBe("m d hh:mm a");

    const d2 = parseDateTime("1 3 6 PM", locale)!;
    expect(d2.jsDate).toEqual(new DateTime(CURRENT_YEAR, 0, 3, 18, 0, 0));
    expect(d2.format).toBe("m d hh:mm a");
  });

  test("can detect and parse 'm d hh:mm:ss a' datetime", () => {
    const d = parseDateTime("1 3 12:08:06 AM", locale)!;
    expect(d.jsDate).toEqual(new DateTime(CURRENT_YEAR, 0, 3, 0, 8, 6));
    expect(d.format).toBe("m d hh:mm:ss a");
  });

  // mm dd

  test("can detect and parse 'mm dd hh:mm' datetime", () => {
    const d = parseDateTime("1 03 12:09", locale)!;
    expect(d.jsDate).toEqual(new DateTime(CURRENT_YEAR, 0, 3, 12, 9, 0));
    expect(d.format).toBe("mm dd hh:mm");
  });

  test("can detect and parse 'mm dd hh:mm:ss' datetime", () => {
    const d = parseDateTime("1 03 12:08:06", locale)!;
    expect(d.jsDate).toEqual(new DateTime(CURRENT_YEAR, 0, 3, 12, 8, 6));
    expect(d.format).toBe("mm dd hh:mm:ss");
  });

  test("can detect and parse 'mm dd hh:mm a' datetime", () => {
    const d1 = parseDateTime("1 03 12:09 AM", locale)!;
    expect(d1.jsDate).toEqual(new DateTime(CURRENT_YEAR, 0, 3, 0, 9, 0));
    expect(d1.format).toBe("mm dd hh:mm a");

    const d2 = parseDateTime("1 03 6 PM", locale)!;
    expect(d2.jsDate).toEqual(new DateTime(CURRENT_YEAR, 0, 3, 18, 0, 0));
    expect(d2.format).toBe("mm dd hh:mm a");
  });

  test("can detect and parse 'mm dd hh:mm:ss a' datetime", () => {
    const d = parseDateTime("1 03 12:08:06 AM", locale)!;
    expect(d.jsDate).toEqual(new DateTime(CURRENT_YEAR, 0, 3, 0, 8, 6));
    expect(d.format).toBe("mm dd hh:mm:ss a");
  });
});

describe("Date formats with various locales", () => {
  const mdyLocale = DEFAULT_LOCALE;
  const dmyLocale = { ...DEFAULT_LOCALE, dateFormat: "dd/mm/yyyy" };
  const ymdLocale = { ...DEFAULT_LOCALE, dateFormat: "yyyy/mm/dd" };

  const mdyDateFormat = "mm/dd/yyyy";
  const dmyDateFormat = "dd/mm/yyyy";
  const ymdDateFormat = "yyyy/mm/dd";

  test.each([
    // 4 digits year at start of string
    ["2012 03 01", mdyDateFormat, new DateTime(2012, 2, 1), "yyyy mm dd"],
    ["2012 03 01", dmyDateFormat, new DateTime(2012, 2, 1), "yyyy mm dd"],
    ["2012 03 01", ymdDateFormat, new DateTime(2012, 2, 1), "yyyy mm dd"],

    // 4 digits year at start of string
    ["2012-03", mdyDateFormat, new DateTime(2012, 2, 1), "yyyy-mm"],
    ["2012-03", dmyDateFormat, new DateTime(2012, 2, 1), "yyyy-mm"],
    ["2012-03", ymdDateFormat, new DateTime(2012, 2, 1), "yyyy-mm"],

    // 4 digits year at end of string
    ["01/03/2012", mdyDateFormat, new DateTime(2012, 0, 3), "mm/dd/yyyy"],
    ["01/03/2012", dmyDateFormat, new DateTime(2012, 2, 1), "dd/mm/yyyy"],
    ["01/03/2012", ymdDateFormat, new DateTime(2012, 2, 1), "dd/mm/yyyy"],

    // 2 digits year in date string
    ["01 03 12", mdyDateFormat, new DateTime(2012, 0, 3), "mm dd yy"],
    ["01 03 12", dmyDateFormat, new DateTime(2012, 2, 1), "dd mm yy"],
    ["01 03 12", ymdDateFormat, new DateTime(2001, 2, 12), "yy mm dd"],

    // date strings with only 2 parts in date
    ["2-3", mdyDateFormat, new DateTime(CURRENT_YEAR, 1, 3), "m-d"],
    ["2-3", dmyDateFormat, new DateTime(CURRENT_YEAR, 2, 2), "d-m"],
    ["2-3", ymdDateFormat, new DateTime(CURRENT_YEAR, 1, 3), "m-d"],
  ])(
    "format with date string %s with date format %s",
    (value, localeFormat, expectedDate, expectedFormat) => {
      const locale = { ...DEFAULT_LOCALE, dateFormat: localeFormat };
      expect(parseDateTime(value, locale)).toMatchObject({
        format: expectedFormat,
        jsDate: expectedDate,
      });
    }
  );

  test("No date detected for invalid dates", () => {
    // DMY locale
    expect(parseDateTime("01 13 01", dmyLocale)).toBeNull();
    expect(parseDateTime("31 01 01", dmyLocale)).not.toBeNull();
    expect(parseDateTime("32 01 01", dmyLocale)).toBeNull();
    expect(parseDateTime("29 02 01", dmyLocale)).toBeNull();
    expect(parseDateTime("29 02 04", dmyLocale)).not.toBeNull();
    expect(parseDateTime("30 02 04", dmyLocale)).toBeNull();
    expect(parseDateTime("-10 02 04", dmyLocale)).toBeNull();
    expect(parseDateTime("10 -02 04", dmyLocale)).toBeNull();
    expect(parseDateTime("10 02 -04", dmyLocale)).toBeNull();

    // MDY locale
    expect(parseDateTime("13 01 01", mdyLocale)).toBeNull();
    expect(parseDateTime("01 31 01", mdyLocale)).not.toBeNull();
    expect(parseDateTime("01 32 01", mdyLocale)).toBeNull();
    expect(parseDateTime("02 29 01", mdyLocale)).toBeNull();
    expect(parseDateTime("02 29 04", mdyLocale)).not.toBeNull();
    expect(parseDateTime("02 30 04", mdyLocale)).toBeNull();
    expect(parseDateTime("-02 10 04", mdyLocale)).toBeNull();
    expect(parseDateTime("02 -10 04", mdyLocale)).toBeNull();
    expect(parseDateTime("02 10 -04", mdyLocale)).toBeNull();

    // YMD locale
    expect(parseDateTime("01 13 01", ymdLocale)).toBeNull();
    expect(parseDateTime("01 01 31", ymdLocale)).not.toBeNull();
    expect(parseDateTime("01 01 32", ymdLocale)).toBeNull();
    expect(parseDateTime("01 02 29", ymdLocale)).toBeNull();
    expect(parseDateTime("04 02 29", ymdLocale)).not.toBeNull();
    expect(parseDateTime("04 02 30", ymdLocale)).toBeNull();
    expect(parseDateTime("-04 02 10", ymdLocale)).toBeNull();
    expect(parseDateTime("04 -02 10", ymdLocale)).toBeNull();
    expect(parseDateTime("04 02 -10", ymdLocale)).toBeNull();
  });
});

describe("Number of digits in year/month/days in format", () => {
  test("leading zeroes in days", () => {
    expect(parseDateTime("1-3-2002", locale)).toMatchObject({ format: "m-d-yyyy" });
    expect(parseDateTime("1-30-2002", locale)).toMatchObject({ format: "m-d-yyyy" });
    expect(parseDateTime("1-03-2002", locale)).toMatchObject({ format: "mm-dd-yyyy" });
  });

  test("leading zeroes in months", () => {
    expect(parseDateTime("1-3-2002", locale)).toMatchObject({ format: "m-d-yyyy" });
    expect(parseDateTime("10-3-2002", locale)).toMatchObject({ format: "m-d-yyyy" });
    expect(parseDateTime("01-3-2002", locale)).toMatchObject({ format: "mm-dd-yyyy" });
  });

  test("yy or yyyy format depending on the number of year digits in the string", () => {
    // This is GSheet behaviour. Excel always outputs "yyyy" and doesn't recognize "1-3-002"
    expect(parseDateTime("1-3-2", locale)).toMatchObject({ format: "m-d-yyyy" });
    expect(parseDateTime("1-3-02", locale)).toMatchObject({ format: "m-d-yy" });
    expect(parseDateTime("1-3-002", locale)).toMatchObject({ format: "m-d-yyyy" });
    expect(parseDateTime("1-3-2002", locale)).toMatchObject({ format: "m-d-yyyy" });
  });
});
