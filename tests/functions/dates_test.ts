import { parseDateTime, formatDateTime } from "../../src/functions/dates";

const CURRENT_YEAR = new Date().getFullYear();

// -----------------------------------------------------------------------------
// Test on date
// -----------------------------------------------------------------------------

describe("date helpers: can detect and parse various dates", () => {
  test("can properly convert various dates in a large time span", () => {
    expect(parseDateTime("1/1/1000")!.value).toBe(-328716);
    expect(parseDateTime("1/1/2000")!.value).toBe(36526);
    expect(parseDateTime("1/1/3000")!.value).toBe(401769);
    expect(parseDateTime("1/1/4000")!.value).toBe(767011);
  });

  test("parse various dates in m/d/yyyy format", () => {
    expect(parseDateTime("12/30/1899")).toEqual({
      value: 0,
      format: "m/d/yyyy",
      jsDate: new Date(1899, 11, 30),
    });
    expect(parseDateTime("12/31/1899")).toEqual({
      value: 1,
      format: "m/d/yyyy",
      jsDate: new Date(1899, 11, 31),
    });
    expect(parseDateTime("1/1/1900")).toEqual({
      value: 2,
      format: "m/d/yyyy",
      jsDate: new Date(1900, 0, 1),
    });
    expect(parseDateTime("4/20/2020")).toEqual({
      value: 43941,
      format: "m/d/yyyy",
      jsDate: new Date(2020, 3, 20),
    });
  });

  test("parse various dates in yyyy/m/d format", () => {
    expect(parseDateTime("1899/12/30")).toEqual({
      value: 0,
      format: "yyyy/m/d",
      jsDate: new Date(1899, 11, 30),
    });
    expect(parseDateTime("1899/12/31")).toEqual({
      value: 1,
      format: "yyyy/m/d",
      jsDate: new Date(1899, 11, 31),
    });
    expect(parseDateTime("1900/1/1")).toEqual({
      value: 2,
      format: "yyyy/m/d",
      jsDate: new Date(1900, 0, 1),
    });
    expect(parseDateTime("2020/4/20")).toEqual({
      value: 43941,
      format: "yyyy/m/d",
      jsDate: new Date(2020, 3, 20),
    });
  });

  test("can detect and parse mm/dd/yyyy dates ", () => {
    expect(parseDateTime("03/20/2010")).toEqual({
      value: 40257,
      format: "mm/dd/yyyy",
      jsDate: new Date(2010, 2, 20),
    });
    expect(parseDateTime("10/03/2010")).toEqual({
      value: 40454,
      format: "mm/dd/yyyy",
      jsDate: new Date(2010, 9, 3),
    });
  });

  test("can detect and parse yyyy/mm/dd dates ", () => {
    expect(parseDateTime("2010/03/20")).toEqual({
      value: 40257,
      format: "yyyy/mm/dd",
      jsDate: new Date(2010, 2, 20),
    });
    expect(parseDateTime("2010/10/03")).toEqual({
      value: 40454,
      format: "yyyy/mm/dd",
      jsDate: new Date(2010, 9, 3),
    });
  });

  test("can detect and parse m/d and mm/dd dates ", () => {
    const d1 = parseDateTime("1/3")!;
    expect(d1.jsDate!).toEqual(new Date(CURRENT_YEAR, 0, 3));
    expect(d1.format).toBe("m/d");

    const d2 = parseDateTime("1/03")!;
    expect(d2.jsDate!).toEqual(new Date(CURRENT_YEAR, 0, 3));
    expect(d2.format).toBe("mm/dd");
  });

  test("can detect and parse m-d-yyyy dates ", () => {
    expect(parseDateTime("3-2-2010")).toEqual({
      value: 40239,
      format: "m-d-yyyy",
      jsDate: new Date(2010, 2, 2),
    });
    expect(parseDateTime("10-23-2010")).toEqual({
      value: 40474,
      format: "m-d-yyyy",
      jsDate: new Date(2010, 9, 23),
    });
  });

  test("can detect and parse yyyy-m-d dates ", () => {
    expect(parseDateTime("2010-3-2")).toEqual({
      value: 40239,
      format: "yyyy-m-d",
      jsDate: new Date(2010, 2, 2),
    });
    expect(parseDateTime("2010-10-23")).toEqual({
      value: 40474,
      format: "yyyy-m-d",
      jsDate: new Date(2010, 9, 23),
    });
  });

  test("can detect and parse yyyy-mm-dd dates ", () => {
    expect(parseDateTime("2010-03-20")).toEqual({
      value: 40257,
      format: "yyyy-mm-dd",
      jsDate: new Date(2010, 2, 20),
    });
    expect(parseDateTime("2010-10-03")).toEqual({
      value: 40454,
      format: "yyyy-mm-dd",
      jsDate: new Date(2010, 9, 3),
    });
  });

  test("can detect and parse m-d and mm-dd dates ", () => {
    const d1 = parseDateTime("1-3")!;
    expect(d1.jsDate!).toEqual(new Date(CURRENT_YEAR, 0, 3));
    expect(d1.format).toBe("m-d");

    const d2 = parseDateTime("1-03")!;
    expect(d2.jsDate!).toEqual(new Date(CURRENT_YEAR, 0, 3));
    expect(d2.format).toBe("mm-dd");
  });

  test('can detect and parse "mm dd yyyy" dates ', () => {
    expect(parseDateTime("03 20 2010")).toEqual({
      value: 40257,
      format: "mm dd yyyy",
      jsDate: new Date(2010, 2, 20),
    });
    expect(parseDateTime("10 03 2010")).toEqual({
      value: 40454,
      format: "mm dd yyyy",
      jsDate: new Date(2010, 9, 3),
    });
  });

  test('can detect and parse "yyyy mm dd" dates ', () => {
    expect(parseDateTime("2010 03 20")).toEqual({
      value: 40257,
      format: "yyyy mm dd",
      jsDate: new Date(2010, 2, 20),
    });
    expect(parseDateTime("2010 10 03")).toEqual({
      value: 40454,
      format: "yyyy mm dd",
      jsDate: new Date(2010, 9, 3),
    });
  });

  test("can detect and parse 'm d' and 'mm dd' dates ", () => {
    const d1 = parseDateTime("1 3")!;
    expect(d1.jsDate!).toEqual(new Date(CURRENT_YEAR, 0, 3));
    expect(d1.format).toBe("m d");

    const d2 = parseDateTime("1 03")!;
    expect(d2.jsDate!).toEqual(new Date(CURRENT_YEAR, 0, 3));
    expect(d2.format).toBe("mm dd");
  });

  test("does not parse invalid dates", () => {
    expect(parseDateTime("100/100/2099")).toBeNull();
    expect(parseDateTime("20/10/2020")).toBeNull(); // 20 is not a valid month
    expect(parseDateTime("02/29/2020")).not.toBeNull();
    expect(parseDateTime("02/30/2020")).toBeNull();
    expect(parseDateTime("02/28/2021")).not.toBeNull();
    expect(parseDateTime("02/29/2021")).toBeNull();
    expect(parseDateTime("01/33/2021")).toBeNull();
  });

  test("can infer a year if not given completely", () => {
    const getYear = (str) => parseDateTime(str)!.jsDate!.getFullYear();

    expect(getYear("1/1/0")).toBe(2000);
    expect(getYear("1/1/8")).toBe(2008);
    expect(getYear("1/1/12")).toBe(2012);

    expect(getYear(`1/1/${CURRENT_YEAR - 2000 + 9}`)).toBe(CURRENT_YEAR + 9);
    expect(getYear(`1/1/${CURRENT_YEAR - 2000 + 10}`)).toBe(CURRENT_YEAR + 10);
    expect(getYear(`1/1/${CURRENT_YEAR - 2000 + 11}`)).toBe(CURRENT_YEAR + 11 - 100);
  });

  test("refuse various strings", () => {
    expect(parseDateTime("1/1/1920/3")).toBe(null);
    expect(parseDateTime("1.2/10/2020")).toBe(null);
  });
});

describe("formatDateTime", () => {
  const internalDate = parseDateTime("01/02/1954")!;
  const value = internalDate.value;

  test.each([
    [internalDate.format, "01/02/1954"],
    ["m/d/yyyy", "1/2/1954"],
    ["mm/dd/yyyy", "01/02/1954"],
    ["mm/dd", "01/02"],
    ["m/d", "1/2"],
  ])("month day year, with / as separator", (format, result) => {
    expect(formatDateTime({ value, format })).toBe(result);
  });

  test.each([
    ["m-d-yyyy", "1-2-1954"],
    ["mm-dd-yyyy", "01-02-1954"],
    ["mm-dd", "01-02"],
    ["m-d", "1-2"],
  ])("month day year, with - as separator", (format, result) => {
    expect(formatDateTime({ value, format })).toBe(result);
  });

  test.each([
    ["m d yyyy", "1 2 1954"],
    ["mm dd yyyy", "01 02 1954"],
    ["mm dd", "01 02"],
    ["m d", "1 2"],
  ])("month day year, with '  as separator", (format, result) => {
    expect(formatDateTime({ value, format })).toBe(result);
  });

  test.each([
    ["yyyy/m/d", "1954/1/2"],
    ["yyyy/mm/dd", "1954/01/02"],
  ])("year month day, with / as separator", (format, result) => {
    expect(formatDateTime({ value, format })).toBe(result);
  });

  test.each([
    ["yyyy-m-d", "1954-1-2"],
    ["yyyy-mm-dd", "1954-01-02"],
  ])("year month day, with - as separator", (format, result) => {
    expect(formatDateTime({ value, format })).toBe(result);
  });

  test.each([
    ["yyyy m d", "1954 1 2"],
    ["yyyy mm dd", "1954 01 02"],
  ])("year month day, with ' ' as separator", (format, result) => {
    expect(formatDateTime({ value, format })).toBe(result);
  });
});

// -----------------------------------------------------------------------------
// Test on time
// -----------------------------------------------------------------------------

describe("date helpers: can detect and parse various times", () => {
  test("can detect and parse 'hh:mm' times", () => {
    expect(parseDateTime("00:00")).toEqual({
      value: 0,
      format: "hh:mm",
      jsDate: new Date(1899, 11, 30, 0, 0, 0),
    });
    expect(parseDateTime("6:00")).toEqual({
      value: 0.25,
      format: "hh:mm",
      jsDate: new Date(1899, 11, 30, 6, 0, 0),
    });
    expect(parseDateTime("12:09")).toEqual({
      value: 0.50625,
      format: "hh:mm",
      jsDate: new Date(1899, 11, 30, 12, 9, 0),
    });
    expect(parseDateTime("12:9")).toEqual({
      // @compatibility: on google sheets, return string
      value: 0.50625,
      format: "hh:mm",
      jsDate: new Date(1899, 11, 30, 12, 9, 0),
    });
    expect(parseDateTime("00012:09")).toEqual({
      value: 0.50625,
      format: "hh:mm",
      jsDate: new Date(1899, 11, 30, 12, 9, 0),
    });
    expect(parseDateTime("12:00000009")).toEqual({
      value: 0.50625,
      format: "hh:mm",
      jsDate: new Date(1899, 11, 30, 12, 9, 0),
    });
    expect(parseDateTime("11:69")).toEqual({
      value: 0.50625,
      format: "hh:mm",
      jsDate: new Date(1899, 11, 30, 12, 9, 0),
    });
  });

  test("can detect and parse 'hh:mm:ss' times", () => {
    expect(parseDateTime("12:00:00")).toEqual({
      value: 0.5,
      format: "hh:mm:ss",
      jsDate: new Date(1899, 11, 30, 12, 0, 0),
    });
    expect(parseDateTime("12:08:06")).toEqual({
      value: 0.505625,
      format: "hh:mm:ss",
      jsDate: new Date(1899, 11, 30, 12, 8, 6),
    });
    expect(parseDateTime("12:8:6")).toEqual({
      value: 0.505625,
      format: "hh:mm:ss",
      jsDate: new Date(1899, 11, 30, 12, 8, 6),
    });
    expect(parseDateTime("12:008:006")).toEqual({
      value: 0.505625,
      format: "hh:mm:ss",
      jsDate: new Date(1899, 11, 30, 12, 8, 6),
    });
    expect(parseDateTime("11:59:546")).toEqual({
      value: 0.505625,
      format: "hh:mm:ss",
      jsDate: new Date(1899, 11, 30, 12, 8, 6),
    });
  });

  test("can detect and parse 'hh:mm a' times", () => {
    expect(parseDateTime("0 AM")).toEqual({
      value: 0,
      format: "hh:mm a",
      jsDate: new Date(1899, 11, 30, 0, 0, 0),
    });
    expect(parseDateTime("12 AM")).toEqual({
      value: 0,
      format: "hh:mm a",
      jsDate: new Date(1899, 11, 30, 0, 0, 0),
    });
    expect(parseDateTime("24 AM")).toEqual({
      // @compatibility: on google sheets, return string
      value: 0.5,
      format: "hh:mm a",
      jsDate: new Date(1899, 11, 30, 12, 0, 0),
    });
    expect(parseDateTime("6AM")).toEqual({
      value: 0.25,
      format: "hh:mm a",
      jsDate: new Date(1899, 11, 30, 6, 0, 0),
    });
    expect(parseDateTime("6   AM")).toEqual({
      value: 0.25,
      format: "hh:mm a",
      jsDate: new Date(1899, 11, 30, 6, 0, 0),
    });

    expect(parseDateTime("0 PM")).toEqual({
      value: 0.5,
      format: "hh:mm a",
      jsDate: new Date(1899, 11, 30, 12, 0, 0),
    });
    expect(parseDateTime("12 PM")).toEqual({
      value: 0.5,
      format: "hh:mm a",
      jsDate: new Date(1899, 11, 30, 12, 0, 0),
    });
    expect(parseDateTime("6PM")).toEqual({
      value: 0.75,
      format: "hh:mm a",
      jsDate: new Date(1899, 11, 30, 18, 0, 0),
    });
    expect(parseDateTime("6   PM")).toEqual({
      value: 0.75,
      format: "hh:mm a",
      jsDate: new Date(1899, 11, 30, 18, 0, 0),
    });

    expect(parseDateTime("0:09 AM")).toEqual({
      value: 0.00625,
      format: "hh:mm a",
      jsDate: new Date(1899, 11, 30, 0, 9, 0),
    });
    expect(parseDateTime("12:09 AM")).toEqual({
      value: 0.00625,
      format: "hh:mm a",
      jsDate: new Date(1899, 11, 30, 0, 9, 0),
    });
    expect(parseDateTime("00012:00000009    AM")).toEqual({
      value: 0.00625,
      format: "hh:mm a",
      jsDate: new Date(1899, 11, 30, 0, 9, 0),
    });

    expect(parseDateTime("11:69 AM")).toEqual({
      value: 0.50625,
      format: "hh:mm a",
      jsDate: new Date(1899, 11, 30, 12, 9, 0),
    });
    expect(parseDateTime("18:00 AM")).toEqual({
      value: 0.25,
      format: "hh:mm a",
      jsDate: new Date(1899, 11, 30, 6, 0, 0),
    });
  });

  test("can detect and parse 'hh:mm:ss a' times", () => {
    expect(parseDateTime("12:00:00 AM")).toEqual({
      value: 0,
      format: "hh:mm:ss a",
      jsDate: new Date(1899, 11, 30, 0, 0, 0),
    });
    expect(parseDateTime("00:00:00 AM")).toEqual({
      value: 0,
      format: "hh:mm:ss a",
      jsDate: new Date(1899, 11, 30, 0, 0, 0),
    });
    expect(parseDateTime("12:00:00 PM")).toEqual({
      value: 0.5,
      format: "hh:mm:ss a",
      jsDate: new Date(1899, 11, 30, 12, 0, 0),
    });
    expect(parseDateTime("0:00:00 PM")).toEqual({
      value: 0.5,
      format: "hh:mm:ss a",
      jsDate: new Date(1899, 11, 30, 12, 0, 0),
    });
    expect(parseDateTime("12:08:06 AM")).toEqual({
      value: 0.005625,
      format: "hh:mm:ss a",
      jsDate: new Date(1899, 11, 30, 0, 8, 6),
    });
    expect(parseDateTime("12:8:6 AM")).toEqual({
      value: 0.005625,
      format: "hh:mm:ss a",
      jsDate: new Date(1899, 11, 30, 0, 8, 6),
    });
    expect(parseDateTime("12:008:006 AM")).toEqual({
      value: 0.005625,
      format: "hh:mm:ss a",
      jsDate: new Date(1899, 11, 30, 0, 8, 6),
    });
    expect(parseDateTime("11:59:546   AM")).toEqual({
      value: 0.505625,
      format: "hh:mm:ss a",
      jsDate: new Date(1899, 11, 30, 12, 8, 6),
    });
  });

  test("can detect and parse 'hhhh:mm:ss' times", () => {
    expect(parseDateTime("30:00")).toEqual({
      value: 1.25,
      format: "hhhh:mm:ss",
      jsDate: new Date(1899, 11, 31, 6, 0, 0),
    });
    expect(parseDateTime("24:08:06")).toEqual({
      value: 1.005625,
      format: "hhhh:mm:ss",
      jsDate: new Date(1899, 11, 31, 0, 8, 6),
    });
    expect(parseDateTime("36 AM")).toEqual({
      value: 1,
      format: "hhhh:mm:ss",
      jsDate: new Date(1899, 11, 31, 0, 0, 0),
    });
    expect(parseDateTime("24 PM")).toEqual({
      value: 1,
      format: "hhhh:mm:ss",
      jsDate: new Date(1899, 11, 31, 0, 0, 0),
    });
    expect(parseDateTime("36:09 AM")).toEqual({
      value: 1.00625,
      format: "hhhh:mm:ss",
      jsDate: new Date(1899, 11, 31, 0, 9, 0),
    });
    expect(parseDateTime("23:59:60 PM")).toEqual({
      value: 1,
      format: "hhhh:mm:ss",
      jsDate: new Date(1899, 11, 31, 0, 0, 0),
    });
  });
});

describe("formatDateTime", () => {
  const internalDate = parseDateTime("01/02/1954")!;
  const value = internalDate.value;

  test.each([
    [internalDate.format, "01/02/1954"],
    ["m/d/yyyy", "1/2/1954"],
    ["mm/dd/yyyy", "01/02/1954"],
    ["mm/dd", "01/02"],
    ["m/d", "1/2"],
  ])("month day year, with / as separator", (format, result) => {
    expect(formatDateTime({ value, format })).toBe(result);
  });

  test("hours minutes 'hh:mm', without format", () => {
    expect(formatDateTime(parseDateTime("0:0")!)).toBe("00:00");
    expect(formatDateTime(parseDateTime("6:0")!)).toBe("06:00");
    expect(formatDateTime(parseDateTime("12:9")!)).toBe("12:09");
    expect(formatDateTime(parseDateTime("00012:09")!)).toBe("12:09");
    expect(formatDateTime(parseDateTime("12:00000009")!)).toBe("12:09");
    expect(formatDateTime(parseDateTime("11:69")!)).toBe("12:09");
  });

  test.each([
    ["12:08:06", "12:08"],
    ["05:09 PM", "17:09"],
    ["012:008:006 AM", "00:08"],
    ["30:00:00", "06:00"],
  ])("hours minutes 'hh:mm', with format", (date, result) => {
    const value = parseDateTime(date)!.value;
    const format = "hh:mm";
    expect(formatDateTime({ value, format })).toBe(result);
  });

  test("hours minutes seconds 'hh:mm:ss', without format", () => {
    expect(formatDateTime(parseDateTime("12:0:0")!)).toBe("12:00:00");
    expect(formatDateTime(parseDateTime("12:8:6")!)).toBe("12:08:06");
    expect(formatDateTime(parseDateTime("0012:008:006")!)).toBe("12:08:06");
    expect(formatDateTime(parseDateTime("11:59:546")!)).toBe("12:08:06");
  });

  test.each([
    ["12:08", "12:08:00"],
    ["05:09 PM", "17:09:00"],
    ["012:008:006 AM", "00:08:06"],
    ["30:00:00", "06:00:00"],
  ])("hours minutes seconds 'hh:mm:ss', with format", (date, result) => {
    const value = parseDateTime(date)!.value;
    const format = "hh:mm:ss";
    expect(formatDateTime({ value, format })).toBe(result);
  });

  test("hours minutes meridian 'hh:mm a', without format", () => {
    expect(formatDateTime(parseDateTime("0 AM")!)).toBe("12:00 AM");
    expect(formatDateTime(parseDateTime("0 PM")!)).toBe("12:00 PM");
    expect(formatDateTime(parseDateTime("6AM")!)).toBe("06:00 AM");
    expect(formatDateTime(parseDateTime("6    AM")!)).toBe("06:00 AM");
    expect(formatDateTime(parseDateTime("7PM")!)).toBe("07:00 PM");
    expect(formatDateTime(parseDateTime("7    PM")!)).toBe("07:00 PM");
    expect(formatDateTime(parseDateTime("12 AM")!)).toBe("12:00 AM");
    expect(formatDateTime(parseDateTime("12 PM")!)).toBe("12:00 PM");
    expect(formatDateTime(parseDateTime("13 AM")!)).toBe("01:00 AM"); // @compatibility: on google sheets, parsing impposible
    expect(formatDateTime(parseDateTime("13 PM")!)).toBe("01:00 PM"); // @compatibility: on google sheets, parsing impposible
    expect(formatDateTime(parseDateTime("24 AM")!)).toBe("12:00 PM"); // @compatibility: on google sheets, parsing impposible
    expect(formatDateTime(parseDateTime("0:09 AM")!)).toBe("12:09 AM");
    expect(formatDateTime(parseDateTime("12:9 AM")!)).toBe("12:09 AM");
    expect(formatDateTime(parseDateTime("00012:0009 AM")!)).toBe("12:09 AM");
    expect(formatDateTime(parseDateTime("11:69 AM")!)).toBe("12:09 PM");
    expect(formatDateTime(parseDateTime("18:00 AM")!)).toBe("06:00 AM");
  });

  test.each([
    ["12:08", "12:08 PM"],
    ["12:08:06", "12:08 PM"],
    ["012:008:006 AM", "12:08 AM"],
    ["30:00:00", "06:00 AM"],
  ])("hours minutes meridian 'hh:mm a', with format", (date, result) => {
    const value = parseDateTime(date)!.value;
    const format = "hh:mm a";
    expect(formatDateTime({ value, format })).toBe(result);
  });

  test("hours minutes seconds meridian 'hh:mm:ss a', without format", () => {
    expect(formatDateTime(parseDateTime("00:00:00 AM")!)).toBe("12:00:00 AM");
    expect(formatDateTime(parseDateTime("00:00:00 PM")!)).toBe("12:00:00 PM");
    expect(formatDateTime(parseDateTime("12:00:00 AM")!)).toBe("12:00:00 AM");
    expect(formatDateTime(parseDateTime("012:008:006 AM")!)).toBe("12:08:06 AM");
    expect(formatDateTime(parseDateTime("11:59:546   AM")!)).toBe("12:08:06 PM");
  });

  test.each([
    ["12:08", "12:08:00 PM"],
    ["12:08:06", "12:08:06 PM"],
    ["05:09 PM", "05:09:00 PM"],
    ["30:00:00", "06:00:00 AM"],
  ])("hours minutes meridian 'hh:mm:ss a', with format", (date, result) => {
    const value = parseDateTime(date)!.value;
    const format = "hh:mm:ss a";
    expect(formatDateTime({ value, format })).toBe(result);
  });

  test("duration 'hhhh:mm:ss', without format", () => {
    expect(formatDateTime(parseDateTime("30:00")!)).toBe("30:00:00");
    expect(formatDateTime(parseDateTime("24:08:06")!)).toBe("24:08:06");
    expect(formatDateTime(parseDateTime("36:09 AM")!)).toBe("24:09:00"); // @compatibility: on google sheets, parsing impposible
    expect(formatDateTime(parseDateTime("24 PM")!)).toBe("24:00:00"); // @compatibility: on google sheets, parsing impposible
    expect(formatDateTime(parseDateTime("11:59:546   PM")!)).toBe("24:08:06");
  });

  test.each([
    ["12:08", "12:08:00"],
    ["12:08:06", "12:08:06"],
    ["05:09 PM", "17:09:00"],
    ["012:008:006 AM", "0:08:06"],
  ])("hours minutes meridian 'hh:mm:ss a', with format", (date, result) => {
    const value = parseDateTime(date)!.value;
    const format = "hhhh:mm:ss";
    expect(formatDateTime({ value, format })).toBe(result);
  });
});

// -----------------------------------------------------------------------------
// Test on date and time
// -----------------------------------------------------------------------------

describe("date helpers: can detect and parse various datetimes (with '/' separator)", () => {
  // m/d/yyyy

  test("can detect and parse 'm/d/yyyy hh:mm' datetime", () => {
    expect(parseDateTime("4/20/2020 12:09")).toEqual({
      value: 43941.50625,
      format: "m/d/yyyy hh:mm",
      jsDate: new Date(2020, 3, 20, 12, 9, 0),
    });
  });

  test("can detect and parse 'm/d/yyyy hh:mm:ss' datetime", () => {
    expect(parseDateTime("4/20/2020 12:08:06")).toEqual({
      value: 43941.505625,
      format: "m/d/yyyy hh:mm:ss",
      jsDate: new Date(2020, 3, 20, 12, 8, 6),
    });
  });

  test("can detect and parse 'm/d/yyyy hh:mm a' datetime", () => {
    expect(parseDateTime("4/20/2020 12:09 AM")).toEqual({
      value: 43941.00625,
      format: "m/d/yyyy hh:mm a",
      jsDate: new Date(2020, 3, 20, 0, 9, 0),
    });
    expect(parseDateTime("4/20/2020 6 PM")).toEqual({
      value: 43941.75,
      format: "m/d/yyyy hh:mm a",
      jsDate: new Date(2020, 3, 20, 18, 0, 0),
    });
  });

  test("can detect and parse 'm/d/yyyy hh:mm:ss a' datetime", () => {
    expect(parseDateTime("4/20/2020 12:08:06 AM")).toEqual({
      value: 43941.005625,
      format: "m/d/yyyy hh:mm:ss a",
      jsDate: new Date(2020, 3, 20, 0, 8, 6),
    });
  });

  // yyyy/m/d

  test("can detect and parse 'yyyy/m/d hh:mm' datetime", () => {
    expect(parseDateTime("2020/4/20 12:09")).toEqual({
      value: 43941.50625,
      format: "yyyy/m/d hh:mm",
      jsDate: new Date(2020, 3, 20, 12, 9, 0),
    });
  });

  test("can detect and parse 'yyyy/m/d hh:mm:ss' datetime", () => {
    expect(parseDateTime("2020/4/20 12:08:06")).toEqual({
      value: 43941.505625,
      format: "yyyy/m/d hh:mm:ss",
      jsDate: new Date(2020, 3, 20, 12, 8, 6),
    });
  });

  test("can detect and parse 'yyyy/m/d hh:mm a' datetime", () => {
    expect(parseDateTime("2020/4/20 12:09 AM")).toEqual({
      value: 43941.00625,
      format: "yyyy/m/d hh:mm a",
      jsDate: new Date(2020, 3, 20, 0, 9, 0),
    });
    expect(parseDateTime("2020/4/20 6 PM")).toEqual({
      value: 43941.75,
      format: "yyyy/m/d hh:mm a",
      jsDate: new Date(2020, 3, 20, 18, 0, 0),
    });
  });

  test("can detect and parse 'yyyy/m/d hh:mm:ss a' datetime", () => {
    expect(parseDateTime("2020/4/20 12:08:06 AM")).toEqual({
      value: 43941.005625,
      format: "yyyy/m/d hh:mm:ss a",
      jsDate: new Date(2020, 3, 20, 0, 8, 6),
    });
  });

  // mm/dd/yyyy

  test("can detect and parse 'mm/dd/yyyy hh:mm' datetime", () => {
    expect(parseDateTime("03/20/2010 12:09")).toEqual({
      value: 40257.50625,
      format: "mm/dd/yyyy hh:mm",
      jsDate: new Date(2010, 2, 20, 12, 9, 0),
    });
  });

  test("can detect and parse 'mm/dd/yyyy hh:mm:ss' datetime", () => {
    expect(parseDateTime("03/20/2010 12:08:06")).toEqual({
      value: 40257.505625,
      format: "mm/dd/yyyy hh:mm:ss",
      jsDate: new Date(2010, 2, 20, 12, 8, 6),
    });
  });

  test("can detect and parse 'mm/dd/yyyy hh:mm a' datetime", () => {
    expect(parseDateTime("03/20/2010 12:09 AM")).toEqual({
      value: 40257.00625,
      format: "mm/dd/yyyy hh:mm a",
      jsDate: new Date(2010, 2, 20, 0, 9, 0),
    });
    expect(parseDateTime("03/20/2010 6 PM")).toEqual({
      value: 40257.75,

      format: "mm/dd/yyyy hh:mm a",
      jsDate: new Date(2010, 2, 20, 18, 0, 0),
    });
  });

  test("can detect and parse 'mm/dd/yyyy hh:mm:ss a' datetime", () => {
    expect(parseDateTime("03/20/2010 12:08:06 AM")).toEqual({
      value: 40257.005625,
      format: "mm/dd/yyyy hh:mm:ss a",
      jsDate: new Date(2010, 2, 20, 0, 8, 6),
    });
  });

  // yyyy/mm/dd

  test("can detect and parse 'yyyy/mm/dd hh:mm' datetime", () => {
    expect(parseDateTime("2010/03/20 12:09")).toEqual({
      value: 40257.50625,
      format: "yyyy/mm/dd hh:mm",
      jsDate: new Date(2010, 2, 20, 12, 9, 0),
    });
  });

  test("can detect and parse 'yyyy/mm/dd hh:mm:ss' datetime", () => {
    expect(parseDateTime("2010/03/20 12:08:06")).toEqual({
      value: 40257.505625,
      format: "yyyy/mm/dd hh:mm:ss",
      jsDate: new Date(2010, 2, 20, 12, 8, 6),
    });
  });

  test("can detect and parse 'yyyy/mm/dd hh:mm a' datetime", () => {
    expect(parseDateTime("2010/03/20 12:09 AM")).toEqual({
      value: 40257.00625,
      format: "yyyy/mm/dd hh:mm a",
      jsDate: new Date(2010, 2, 20, 0, 9, 0),
    });
    expect(parseDateTime("2010/03/20 6 PM")).toEqual({
      value: 40257.75,
      format: "yyyy/mm/dd hh:mm a",
      jsDate: new Date(2010, 2, 20, 18, 0, 0),
    });
  });

  test("can detect and parse 'yyyy/mm/dd hh:mm:ss a' datetime", () => {
    expect(parseDateTime("2010/03/20 12:08:06 AM")).toEqual({
      value: 40257.005625,
      format: "yyyy/mm/dd hh:mm:ss a",
      jsDate: new Date(2010, 2, 20, 0, 8, 6),
    });
  });

  // m/d

  test("can detect and parse 'm/d hh:mm' datetime", () => {
    const d = parseDateTime("1/3 12:09")!;
    expect(d.jsDate).toEqual(new Date(CURRENT_YEAR, 0, 3, 12, 9, 0));
    expect(d.format).toBe("m/d hh:mm");
  });

  test("can detect and parse 'm/d hh:mm:ss' datetime", () => {
    const d = parseDateTime("1/3 12:08:06")!;
    expect(d.jsDate).toEqual(new Date(CURRENT_YEAR, 0, 3, 12, 8, 6));
    expect(d.format).toBe("m/d hh:mm:ss");
  });

  test("can detect and parse 'm/d hh:mm a' datetime", () => {
    const d1 = parseDateTime("1/3 12:09 AM")!;
    expect(d1.jsDate).toEqual(new Date(CURRENT_YEAR, 0, 3, 0, 9, 0));
    expect(d1.format).toBe("m/d hh:mm a");

    const d2 = parseDateTime("1/3 6 PM")!;
    expect(d2.jsDate).toEqual(new Date(CURRENT_YEAR, 0, 3, 18, 0, 0));
    expect(d2.format).toBe("m/d hh:mm a");
  });

  test("can detect and parse 'm/d hh:mm:ss a' datetime", () => {
    const d = parseDateTime("1/3 12:08:06 AM")!;
    expect(d.jsDate).toEqual(new Date(CURRENT_YEAR, 0, 3, 0, 8, 6));
    expect(d.format).toBe("m/d hh:mm:ss a");
  });

  // mm/dd

  test("can detect and parse 'mm/dd hh:mm' datetime", () => {
    const d = parseDateTime("1/03 12:09")!;
    expect(d.jsDate).toEqual(new Date(CURRENT_YEAR, 0, 3, 12, 9, 0));
    expect(d.format).toBe("mm/dd hh:mm");
  });

  test("can detect and parse 'mm/dd hh:mm:ss' datetime", () => {
    const d = parseDateTime("1/03 12:08:06")!;
    expect(d.jsDate).toEqual(new Date(CURRENT_YEAR, 0, 3, 12, 8, 6));
    expect(d.format).toBe("mm/dd hh:mm:ss");
  });

  test("can detect and parse 'mm/dd hh:mm a' datetime", () => {
    const d1 = parseDateTime("1/03 12:09 AM")!;
    expect(d1.jsDate).toEqual(new Date(CURRENT_YEAR, 0, 3, 0, 9, 0));
    expect(d1.format).toBe("mm/dd hh:mm a");

    const d2 = parseDateTime("1/03 6 PM")!;
    expect(d2.jsDate).toEqual(new Date(CURRENT_YEAR, 0, 3, 18, 0, 0));
    expect(d2.format).toBe("mm/dd hh:mm a");
  });

  test("can detect and parse 'mm/dd hh:mm:ss a' datetime", () => {
    const d = parseDateTime("1/03 12:08:06 AM")!;
    expect(d.jsDate).toEqual(new Date(CURRENT_YEAR, 0, 3, 0, 8, 6));
    expect(d.format).toBe("mm/dd hh:mm:ss a");
  });
});

describe("date helpers: can detect and parse various datetime (with ' ' separator)", () => {
  // m d yyyy

  test("can detect and parse 'm d yyyy hh:mm' datetime", () => {
    expect(parseDateTime("4 20 2020 12:09")).toEqual({
      value: 43941.50625,
      format: "m d yyyy hh:mm",
      jsDate: new Date(2020, 3, 20, 12, 9, 0),
    });
  });

  test("can detect and parse 'm d yyyy hh:mm:ss' datetime", () => {
    expect(parseDateTime("4 20 2020 12:08:06")).toEqual({
      value: 43941.505625,
      format: "m d yyyy hh:mm:ss",
      jsDate: new Date(2020, 3, 20, 12, 8, 6),
    });
  });

  test("can detect and parse 'm d yyyy hh:mm a' datetime", () => {
    expect(parseDateTime("4 20 2020 12:09 AM")).toEqual({
      value: 43941.00625,
      format: "m d yyyy hh:mm a",
      jsDate: new Date(2020, 3, 20, 0, 9, 0),
    });
    expect(parseDateTime("4 20 2020 6 PM")).toEqual({
      value: 43941.75,
      format: "m d yyyy hh:mm a",
      jsDate: new Date(2020, 3, 20, 18, 0, 0),
    });
  });

  test("can detect and parse 'm d yyyy hh:mm:ss a' datetime", () => {
    expect(parseDateTime("4 20 2020 12:08:06 AM")).toEqual({
      value: 43941.005625,
      format: "m d yyyy hh:mm:ss a",
      jsDate: new Date(2020, 3, 20, 0, 8, 6),
    });
  });

  // yyyy m d

  test("can detect and parse 'yyyy m d hh:mm' datetime", () => {
    expect(parseDateTime("2020 4 20 12:09")).toEqual({
      value: 43941.50625,
      format: "yyyy m d hh:mm",
      jsDate: new Date(2020, 3, 20, 12, 9, 0),
    });
  });

  test("can detect and parse 'yyyy m d hh:mm:ss' datetime", () => {
    expect(parseDateTime("2020 4 20 12:08:06")).toEqual({
      value: 43941.505625,
      format: "yyyy m d hh:mm:ss",
      jsDate: new Date(2020, 3, 20, 12, 8, 6),
    });
  });

  test("can detect and parse 'yyyy m d hh:mm a' datetime", () => {
    expect(parseDateTime("2020 4 20 12:09 AM")).toEqual({
      value: 43941.00625,
      format: "yyyy m d hh:mm a",
      jsDate: new Date(2020, 3, 20, 0, 9, 0),
    });
    expect(parseDateTime("2020 4 20 6 PM")).toEqual({
      value: 43941.75,
      format: "yyyy m d hh:mm a",
      jsDate: new Date(2020, 3, 20, 18, 0, 0),
    });
  });

  test("can detect and parse 'yyyy m d hh:mm:ss a' datetime", () => {
    expect(parseDateTime("2020 4 20 12:08:06 AM")).toEqual({
      value: 43941.005625,
      format: "yyyy m d hh:mm:ss a",
      jsDate: new Date(2020, 3, 20, 0, 8, 6),
    });
  });

  // mm dd yyyy

  test("can detect and parse 'mm dd yyyy hh:mm' datetime", () => {
    expect(parseDateTime("03 20 2010 12:09")).toEqual({
      value: 40257.50625,
      format: "mm dd yyyy hh:mm",
      jsDate: new Date(2010, 2, 20, 12, 9, 0),
    });
  });

  test("can detect and parse 'mm dd yyyy hh:mm:ss' datetime", () => {
    expect(parseDateTime("03 20 2010 12:08:06")).toEqual({
      value: 40257.505625,
      format: "mm dd yyyy hh:mm:ss",
      jsDate: new Date(2010, 2, 20, 12, 8, 6),
    });
  });

  test("can detect and parse 'mm dd yyyy hh:mm a' datetime", () => {
    expect(parseDateTime("03 20 2010 12:09 AM")).toEqual({
      value: 40257.00625,
      format: "mm dd yyyy hh:mm a",
      jsDate: new Date(2010, 2, 20, 0, 9, 0),
    });
    expect(parseDateTime("03 20 2010 6 PM")).toEqual({
      value: 40257.75,
      format: "mm dd yyyy hh:mm a",
      jsDate: new Date(2010, 2, 20, 18, 0, 0),
    });
  });

  test("can detect and parse 'mm dd yyyy hh:mm:ss a' datetime", () => {
    expect(parseDateTime("03 20 2010 12:08:06 AM")).toEqual({
      value: 40257.005625,
      format: "mm dd yyyy hh:mm:ss a",
      jsDate: new Date(2010, 2, 20, 0, 8, 6),
    });
  });

  // yyyy mm dd

  test("can detect and parse 'yyyy mm dd hh:mm' datetime", () => {
    expect(parseDateTime("2010 03 20 12:09")).toEqual({
      value: 40257.50625,
      format: "yyyy mm dd hh:mm",
      jsDate: new Date(2010, 2, 20, 12, 9, 0),
    });
  });

  test("can detect and parse 'yyyy mm dd hh:mm:ss' datetime", () => {
    expect(parseDateTime("2010 03 20 12:08:06")).toEqual({
      value: 40257.505625,
      format: "yyyy mm dd hh:mm:ss",
      jsDate: new Date(2010, 2, 20, 12, 8, 6),
    });
  });

  test("can detect and parse 'yyyy mm dd hh:mm a' datetime", () => {
    expect(parseDateTime("2010 03 20 12:09 AM")).toEqual({
      value: 40257.00625,
      format: "yyyy mm dd hh:mm a",
      jsDate: new Date(2010, 2, 20, 0, 9, 0),
    });
    expect(parseDateTime("2010 03 20 6 PM")).toEqual({
      value: 40257.75,
      format: "yyyy mm dd hh:mm a",
      jsDate: new Date(2010, 2, 20, 18, 0, 0),
    });
  });

  test("can detect and parse 'yyyy mm dd hh:mm:ss a' datetime", () => {
    expect(parseDateTime("2010 03 20 12:08:06 AM")).toEqual({
      value: 40257.005625,
      format: "yyyy mm dd hh:mm:ss a",
      jsDate: new Date(2010, 2, 20, 0, 8, 6),
    });
  });

  // m d

  test("can detect and parse 'm d hh:mm' datetime", () => {
    const d = parseDateTime("1 3 12:09")!;
    expect(d.jsDate).toEqual(new Date(CURRENT_YEAR, 0, 3, 12, 9, 0));
    expect(d.format).toBe("m d hh:mm");
  });

  test("can detect and parse 'm d hh:mm:ss' datetime", () => {
    const d = parseDateTime("1 3 12:08:06")!;
    expect(d.jsDate).toEqual(new Date(CURRENT_YEAR, 0, 3, 12, 8, 6));
    expect(d.format).toBe("m d hh:mm:ss");
  });

  test("can detect and parse 'm d hh:mm a' datetime", () => {
    const d1 = parseDateTime("1 3 12:09 AM")!;
    expect(d1.jsDate).toEqual(new Date(CURRENT_YEAR, 0, 3, 0, 9, 0));
    expect(d1.format).toBe("m d hh:mm a");

    const d2 = parseDateTime("1 3 6 PM")!;
    expect(d2.jsDate).toEqual(new Date(CURRENT_YEAR, 0, 3, 18, 0, 0));
    expect(d2.format).toBe("m d hh:mm a");
  });

  test("can detect and parse 'm d hh:mm:ss a' datetime", () => {
    const d = parseDateTime("1 3 12:08:06 AM")!;
    expect(d.jsDate).toEqual(new Date(CURRENT_YEAR, 0, 3, 0, 8, 6));
    expect(d.format).toBe("m d hh:mm:ss a");
  });

  // mm dd

  test("can detect and parse 'mm dd hh:mm' datetime", () => {
    const d = parseDateTime("1 03 12:09")!;
    expect(d.jsDate).toEqual(new Date(CURRENT_YEAR, 0, 3, 12, 9, 0));
    expect(d.format).toBe("mm dd hh:mm");
  });

  test("can detect and parse 'mm dd hh:mm:ss' datetime", () => {
    const d = parseDateTime("1 03 12:08:06")!;
    expect(d.jsDate).toEqual(new Date(CURRENT_YEAR, 0, 3, 12, 8, 6));
    expect(d.format).toBe("mm dd hh:mm:ss");
  });

  test("can detect and parse 'mm dd hh:mm a' datetime", () => {
    const d1 = parseDateTime("1 03 12:09 AM")!;
    expect(d1.jsDate).toEqual(new Date(CURRENT_YEAR, 0, 3, 0, 9, 0));
    expect(d1.format).toBe("mm dd hh:mm a");

    const d2 = parseDateTime("1 03 6 PM")!;
    expect(d2.jsDate).toEqual(new Date(CURRENT_YEAR, 0, 3, 18, 0, 0));
    expect(d2.format).toBe("mm dd hh:mm a");
  });

  test("can detect and parse 'mm dd hh:mm:ss a' datetime", () => {
    const d = parseDateTime("1 03 12:08:06 AM")!;
    expect(d.jsDate).toEqual(new Date(CURRENT_YEAR, 0, 3, 0, 8, 6));
    expect(d.format).toBe("mm dd hh:mm:ss a");
  });
});

describe("formatDateTime", () => {
  test("increment time test on datetime format with 'm/d/yyyy'", () => {
    expect(formatDateTime(parseDateTime("12/5/2020 11:69")!)).toBe("12/5/2020 12:09");
    expect(formatDateTime(parseDateTime("12/5/2020 23:69")!)).toBe("12/6/2020 00:09:00");
    expect(formatDateTime(parseDateTime("12/5/2020 25 AM")!)).toBe("12/5/2020 01:00 PM");
    expect(formatDateTime(parseDateTime("12/5/2020 25:70 PM")!)).toBe("12/6/2020 02:10:00");
  });

  test("increment time test on datetime format with 'yyyy/m/d'", () => {
    expect(formatDateTime(parseDateTime("2020/12/5 11:69")!)).toBe("2020/12/5 12:09");
    expect(formatDateTime(parseDateTime("2020/12/5 23:69")!)).toBe("2020/12/6 00:09:00");
    expect(formatDateTime(parseDateTime("2020/12/5 25 AM")!)).toBe("2020/12/5 01:00 PM");
    expect(formatDateTime(parseDateTime("2020/12/5 25:70 PM")!)).toBe("2020/12/6 02:10:00");
  });

  test("increment time test on datetime format with 'mm/dd/yyyy'", () => {
    expect(formatDateTime(parseDateTime("12/05/2020 11:69")!)).toBe("12/05/2020 12:09");
    expect(formatDateTime(parseDateTime("12/05/2020 23:69")!)).toBe("12/06/2020 00:09:00");
    expect(formatDateTime(parseDateTime("12/05/2020 25 AM")!)).toBe("12/05/2020 01:00 PM");
    expect(formatDateTime(parseDateTime("12/05/2020 25:70 PM")!)).toBe("12/06/2020 02:10:00");
  });

  test("increment time test on datetime format with 'yyyy/mm/dd'", () => {
    expect(formatDateTime(parseDateTime("2020/12/05 11:69")!)).toBe("2020/12/05 12:09");
    expect(formatDateTime(parseDateTime("2020/12/05 23:69")!)).toBe("2020/12/06 00:09:00");
    expect(formatDateTime(parseDateTime("2020/12/05 25 AM")!)).toBe("2020/12/05 01:00 PM");
    expect(formatDateTime(parseDateTime("2020/12/05 25:70 PM")!)).toBe("2020/12/06 02:10:00");
  });

  test("increment time test on datetime format with 'm/d'", () => {
    expect(formatDateTime(parseDateTime("12/5 11:69")!)).toBe("12/5 12:09");
    expect(formatDateTime(parseDateTime("12/5 23:69")!)).toBe("12/6 00:09:00");
    expect(formatDateTime(parseDateTime("12/5 25 AM")!)).toBe("12/5 01:00 PM");
    expect(formatDateTime(parseDateTime("12/5 25:70 PM")!)).toBe("12/6 02:10:00");
  });

  test("increment time test on datetime format with 'mm/dd'", () => {
    expect(formatDateTime(parseDateTime("12/05 11:69")!)).toBe("12/05 12:09");
    expect(formatDateTime(parseDateTime("12/05 23:69")!)).toBe("12/06 00:09:00");
    expect(formatDateTime(parseDateTime("12/05 25 AM")!)).toBe("12/05 01:00 PM");
    expect(formatDateTime(parseDateTime("12/05 25:70 PM")!)).toBe("12/06 02:10:00");
  });

  test("increment time test on datetime format with 'm d yyyy'", () => {
    expect(formatDateTime(parseDateTime("12 5 2020 11:69")!)).toBe("12 5 2020 12:09");
    expect(formatDateTime(parseDateTime("12 5 2020 23:69")!)).toBe("12 6 2020 00:09:00");
    expect(formatDateTime(parseDateTime("12 5 2020 25 AM")!)).toBe("12 5 2020 01:00 PM");
    expect(formatDateTime(parseDateTime("12 5 2020 25:70 PM")!)).toBe("12 6 2020 02:10:00");
  });

  test("increment time test on datetime format with 'yyyy m d'", () => {
    expect(formatDateTime(parseDateTime("2020 12 5 11:69")!)).toBe("2020 12 5 12:09");
    expect(formatDateTime(parseDateTime("2020 12 5 23:69")!)).toBe("2020 12 6 00:09:00");
    expect(formatDateTime(parseDateTime("2020 12 5 25 AM")!)).toBe("2020 12 5 01:00 PM");
    expect(formatDateTime(parseDateTime("2020 12 5 25:70 PM")!)).toBe("2020 12 6 02:10:00");
  });

  test("increment time test on datetime format with 'mm dd yyyy'", () => {
    expect(formatDateTime(parseDateTime("12 05 2020 11:69")!)).toBe("12 05 2020 12:09");
    expect(formatDateTime(parseDateTime("12 05 2020 23:69")!)).toBe("12 06 2020 00:09:00");
    expect(formatDateTime(parseDateTime("12 05 2020 25 AM")!)).toBe("12 05 2020 01:00 PM");
    expect(formatDateTime(parseDateTime("12 05 2020 25:70 PM")!)).toBe("12 06 2020 02:10:00");
  });

  test("increment time test on datetime format with 'yyyy mm dd'", () => {
    expect(formatDateTime(parseDateTime("2020 12 05 11:69")!)).toBe("2020 12 05 12:09");
    expect(formatDateTime(parseDateTime("2020 12 05 23:69")!)).toBe("2020 12 06 00:09:00");
    expect(formatDateTime(parseDateTime("2020 12 05 25 AM")!)).toBe("2020 12 05 01:00 PM");
    expect(formatDateTime(parseDateTime("2020 12 05 25:70 PM")!)).toBe("2020 12 06 02:10:00");
  });

  test("increment time test on datetime format with 'm d'", () => {
    expect(formatDateTime(parseDateTime("12 5 11:69")!)).toBe("12 5 12:09");
    expect(formatDateTime(parseDateTime("12 5 23:69")!)).toBe("12 6 00:09:00");
    expect(formatDateTime(parseDateTime("12 5 25 AM")!)).toBe("12 5 01:00 PM");
    expect(formatDateTime(parseDateTime("12 5 25:70 PM")!)).toBe("12 6 02:10:00");
  });

  test("increment time test on datetime format with 'mm dd'", () => {
    expect(formatDateTime(parseDateTime("12 05 11:69")!)).toBe("12 05 12:09");
    expect(formatDateTime(parseDateTime("12 05 23:69")!)).toBe("12 06 00:09:00");
    expect(formatDateTime(parseDateTime("12 05 25 AM")!)).toBe("12 05 01:00 PM");
    expect(formatDateTime(parseDateTime("12 05 25:70 PM")!)).toBe("12 06 02:10:00");
  });
});
