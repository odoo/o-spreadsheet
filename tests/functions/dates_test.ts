import {
  parseDate,
  parseTime,
  toNativeDate,
  formatDate,
  formatTime,
} from "../../src/functions/dates";

const CURRENT_YEAR = new Date().getFullYear();

// -----------------------------------------------------------------------------
// Test on date
// -----------------------------------------------------------------------------

describe("date helpers: can detect and parse various dates", () => {
  test("can properly convert various dates in a large time span", () => {
    expect(parseDate("1/1/1000")!.value).toBe(-328716);
    expect(parseDate("1/1/2000")!.value).toBe(36526);
    expect(parseDate("1/1/3000")!.value).toBe(401769);
    expect(parseDate("1/1/4000")!.value).toBe(767011);
  });

  test("parse various dates in m/d/yyyy format", () => {
    expect(parseDate("12/30/1899")).toEqual({
      value: 0,
      format: "m/d/yyyy",
      jsDate: new Date(1899, 11, 30),
    });
    expect(parseDate("12/31/1899")).toEqual({
      value: 1,
      format: "m/d/yyyy",
      jsDate: new Date(1899, 11, 31),
    });
    expect(parseDate("1/1/1900")).toEqual({
      value: 2,
      format: "m/d/yyyy",
      jsDate: new Date(1900, 0, 1),
    });
    expect(parseDate("4/20/2020")).toEqual({
      value: 43941,
      format: "m/d/yyyy",
      jsDate: new Date(2020, 3, 20),
    });
  });

  test("parse various dates in yyyy/m/d format", () => {
    expect(parseDate("1899/12/30")).toEqual({
      value: 0,
      format: "yyyy/m/d",
      jsDate: new Date(1899, 11, 30),
    });
    expect(parseDate("1899/12/31")).toEqual({
      value: 1,
      format: "yyyy/m/d",
      jsDate: new Date(1899, 11, 31),
    });
    expect(parseDate("1900/1/1")).toEqual({
      value: 2,
      format: "yyyy/m/d",
      jsDate: new Date(1900, 0, 1),
    });
    expect(parseDate("2020/4/20")).toEqual({
      value: 43941,
      format: "yyyy/m/d",
      jsDate: new Date(2020, 3, 20),
    });
  });

  test("can detect and parse mm/dd/yyyy dates ", () => {
    expect(parseDate("03/20/2010")).toEqual({
      value: 40257,
      format: "mm/dd/yyyy",
      jsDate: new Date(2010, 2, 20),
    });
    expect(parseDate("10/03/2010")).toEqual({
      value: 40454,
      format: "mm/dd/yyyy",
      jsDate: new Date(2010, 9, 3),
    });
  });

  test("can detect and parse yyyy/mm/dd dates ", () => {
    expect(parseDate("2010/03/20")).toEqual({
      value: 40257,
      format: "yyyy/mm/dd",
      jsDate: new Date(2010, 2, 20),
    });
    expect(parseDate("2010/10/03")).toEqual({
      value: 40454,
      format: "yyyy/mm/dd",
      jsDate: new Date(2010, 9, 3),
    });
  });

  test("can detect and parse m/d and mm/dd dates ", () => {
    const d1 = parseDate("1/3")!;
    expect(d1.jsDate!).toEqual(new Date(CURRENT_YEAR, 0, 3));
    expect(d1.format).toBe("m/d");

    const d2 = parseDate("1/03")!;
    expect(d2.jsDate!).toEqual(new Date(CURRENT_YEAR, 0, 3));
    expect(d2.format).toBe("mm/dd");
  });

  test("can detect and parse m-d-yyyy dates ", () => {
    expect(parseDate("3-2-2010")).toEqual({
      value: 40239,
      format: "m-d-yyyy",
      jsDate: new Date(2010, 2, 2),
    });
    expect(parseDate("10-23-2010")).toEqual({
      value: 40474,
      format: "m-d-yyyy",
      jsDate: new Date(2010, 9, 23),
    });
  });

  test("can detect and parse yyyy-m-d dates ", () => {
    expect(parseDate("2010-3-2")).toEqual({
      value: 40239,
      format: "yyyy-m-d",
      jsDate: new Date(2010, 2, 2),
    });
    expect(parseDate("2010-10-23")).toEqual({
      value: 40474,
      format: "yyyy-m-d",
      jsDate: new Date(2010, 9, 23),
    });
  });

  test("can detect and parse yyyy-mm-dd dates ", () => {
    expect(parseDate("2010-03-20")).toEqual({
      value: 40257,
      format: "yyyy-mm-dd",
      jsDate: new Date(2010, 2, 20),
    });
    expect(parseDate("2010-10-03")).toEqual({
      value: 40454,
      format: "yyyy-mm-dd",
      jsDate: new Date(2010, 9, 3),
    });
  });

  test("can detect and parse m-d and mm-dd dates ", () => {
    const d1 = parseDate("1-3")!;
    expect(d1.jsDate!).toEqual(new Date(CURRENT_YEAR, 0, 3));
    expect(d1.format).toBe("m-d");

    const d2 = parseDate("1-03")!;
    expect(d2.jsDate!).toEqual(new Date(CURRENT_YEAR, 0, 3));
    expect(d2.format).toBe("mm-dd");
  });

  test('can detect and parse "mm dd yyyy" dates ', () => {
    expect(parseDate("03 20 2010")).toEqual({
      value: 40257,
      format: "mm dd yyyy",
      jsDate: new Date(2010, 2, 20),
    });
    expect(parseDate("10 03 2010")).toEqual({
      value: 40454,
      format: "mm dd yyyy",
      jsDate: new Date(2010, 9, 3),
    });
  });

  test('can detect and parse "yyyy mm dd" dates ', () => {
    expect(parseDate("2010 03 20")).toEqual({
      value: 40257,
      format: "yyyy mm dd",
      jsDate: new Date(2010, 2, 20),
    });
    expect(parseDate("2010 10 03")).toEqual({
      value: 40454,
      format: "yyyy mm dd",
      jsDate: new Date(2010, 9, 3),
    });
  });

  test("can detect and parse 'm d' and 'mm dd' dates ", () => {
    const d1 = parseDate("1 3")!;
    expect(d1.jsDate!).toEqual(new Date(CURRENT_YEAR, 0, 3));
    expect(d1.format).toBe("m d");

    const d2 = parseDate("1 03")!;
    expect(d2.jsDate!).toEqual(new Date(CURRENT_YEAR, 0, 3));
    expect(d2.format).toBe("mm dd");
  });

  test("does not parse invalid dates", () => {
    expect(parseDate("100/100/2099")).toBeNull();
    expect(parseDate("20/10/2020")).toBeNull(); // 20 is not a valid month
    expect(parseDate("02/29/2020")).not.toBeNull();
    expect(parseDate("02/30/2020")).toBeNull();
    expect(parseDate("02/28/2021")).not.toBeNull();
    expect(parseDate("02/29/2021")).toBeNull();
    expect(parseDate("01/33/2021")).toBeNull();
  });

  test("can infer a year if not given completely", () => {
    const getYear = (str) => toNativeDate(parseDate(str)!).getFullYear();

    expect(getYear("1/1/0")).toBe(2000);
    expect(getYear("1/1/8")).toBe(2008);
    expect(getYear("1/1/12")).toBe(2012);

    expect(getYear(`1/1/${CURRENT_YEAR - 2000 + 9}`)).toBe(CURRENT_YEAR + 9);
    expect(getYear(`1/1/${CURRENT_YEAR - 2000 + 10}`)).toBe(CURRENT_YEAR + 10);
    expect(getYear(`1/1/${CURRENT_YEAR - 2000 + 11}`)).toBe(CURRENT_YEAR + 11 - 100);
  });

  test("refuse various strings", () => {
    expect(parseDate("1/1/1920/3")).toBe(null);
    expect(parseDate("1.2/10/2020")).toBe(null);
  });
});

describe("formatDate", () => {
  test("month day year, with / as separator", () => {
    expect(formatDate(parseDate("01/02/1954")!)).toBe("01/02/1954");
    expect(formatDate(parseDate("1/2/3")!)).toBe("1/2/2003");
    expect(formatDate(parseDate("01/02/1954")!, "m/d/yyyy")).toBe("1/2/1954");
    expect(formatDate(parseDate("01/02/1954")!, "mm/dd/yyyy")).toBe("01/02/1954");
    expect(formatDate(parseDate("01/02/1954")!, "mm/dd")).toBe("01/02");
    expect(formatDate(parseDate("01/02/1954")!, "m/d")).toBe("1/2");
  });

  test("month day year, with - as separator", () => {
    expect(formatDate(parseDate("01/02/1954")!, "m-d-yyyy")).toBe("1-2-1954");
    expect(formatDate(parseDate("01/02/1954")!, "mm-dd-yyyy")).toBe("01-02-1954");
    expect(formatDate(parseDate("01/02/1954")!, "mm-dd")).toBe("01-02");
    expect(formatDate(parseDate("01/02/1954")!, "m-d")).toBe("1-2");
  });

  test("month day year, with ' ' as separator", () => {
    expect(formatDate(parseDate("01/02/1954")!, "m d yyyy")).toBe("1 2 1954");
    expect(formatDate(parseDate("01/02/1954")!, "mm dd yyyy")).toBe("01 02 1954");
    expect(formatDate(parseDate("01/02/1954")!, "mm dd")).toBe("01 02");
    expect(formatDate(parseDate("01/02/1954")!, "m d")).toBe("1 2");
  });

  test("year month day, with / as separator", () => {
    expect(formatDate(parseDate("01/02/1954")!, "yyyy/m/d")).toBe("1954/1/2");
    expect(formatDate(parseDate("01/02/1954")!, "yyyy/mm/dd")).toBe("1954/01/02");
  });

  test("year month day, with - as separator", () => {
    expect(formatDate(parseDate("01/02/1954")!, "yyyy-m-d")).toBe("1954-1-2");
    expect(formatDate(parseDate("01/02/1954")!, "yyyy-mm-dd")).toBe("1954-01-02");
  });

  test("year month day, with ' ' as separator", () => {
    expect(formatDate(parseDate("01/02/1954")!, "yyyy m d")).toBe("1954 1 2");
    expect(formatDate(parseDate("01/02/1954")!, "yyyy mm dd")).toBe("1954 01 02");
  });
});

// -----------------------------------------------------------------------------
// Test on time
// -----------------------------------------------------------------------------

describe("date helpers: can detect and parse various times", () => {
  test("can detect and parse 'hh:mm' times", () => {
    expect(parseTime("00:00")).toEqual({
      value: 0,
      format: "hh:mm",
      jsDate: new Date(1899, 11, 30, 0, 0, 0),
    });
    expect(parseTime("6:00")).toEqual({
      value: 0.25,
      format: "hh:mm",
      jsDate: new Date(1899, 11, 30, 6, 0, 0),
    });
    expect(parseTime("12:09")).toEqual({
      value: 0.50625,
      format: "hh:mm",
      jsDate: new Date(1899, 11, 30, 12, 9, 0),
    });
    expect(parseTime("12:9")).toEqual({
      // @compatibility: on google sheets, return string
      value: 0.50625,
      format: "hh:mm",
      jsDate: new Date(1899, 11, 30, 12, 9, 0),
    });
    expect(parseTime("00012:09")).toEqual({
      value: 0.50625,
      format: "hh:mm",
      jsDate: new Date(1899, 11, 30, 12, 9, 0),
    });
    expect(parseTime("12:00000009")).toEqual({
      value: 0.50625,
      format: "hh:mm",
      jsDate: new Date(1899, 11, 30, 12, 9, 0),
    });
    expect(parseTime("11:69")).toEqual({
      value: 0.50625,
      format: "hh:mm",
      jsDate: new Date(1899, 11, 30, 12, 9, 0),
    });
  });

  test("can detect and parse 'hh:mm:ss' times", () => {
    expect(parseTime("12:00:00")).toEqual({
      value: 0.5,
      format: "hh:mm:ss",
      jsDate: new Date(1899, 11, 30, 12, 0, 0),
    });
    expect(parseTime("12:08:06")).toEqual({
      value: 0.505625,
      format: "hh:mm:ss",
      jsDate: new Date(1899, 11, 30, 12, 8, 6),
    });
    expect(parseTime("12:8:6")).toEqual({
      value: 0.505625,
      format: "hh:mm:ss",
      jsDate: new Date(1899, 11, 30, 12, 8, 6),
    });
    expect(parseTime("12:008:006")).toEqual({
      value: 0.505625,
      format: "hh:mm:ss",
      jsDate: new Date(1899, 11, 30, 12, 8, 6),
    });
    expect(parseTime("11:59:546")).toEqual({
      value: 0.505625,
      format: "hh:mm:ss",
      jsDate: new Date(1899, 11, 30, 12, 8, 6),
    });
  });

  test("can detect and parse 'hh:mm a' times", () => {
    expect(parseTime("0 AM")).toEqual({
      value: 0,
      format: "hh:mm a",
      jsDate: new Date(1899, 11, 30, 0, 0, 0),
    });
    expect(parseTime("12 AM")).toEqual({
      value: 0,
      format: "hh:mm a",
      jsDate: new Date(1899, 11, 30, 0, 0, 0),
    });
    expect(parseTime("24 AM")).toEqual({
      // @compatibility: on google sheets, return string
      value: 0.5,
      format: "hh:mm a",
      jsDate: new Date(1899, 11, 30, 12, 0, 0),
    });
    expect(parseTime("6AM")).toEqual({
      value: 0.25,
      format: "hh:mm a",
      jsDate: new Date(1899, 11, 30, 6, 0, 0),
    });
    expect(parseTime("6   AM")).toEqual({
      value: 0.25,
      format: "hh:mm a",
      jsDate: new Date(1899, 11, 30, 6, 0, 0),
    });

    expect(parseTime("0 PM")).toEqual({
      value: 0.5,
      format: "hh:mm a",
      jsDate: new Date(1899, 11, 30, 12, 0, 0),
    });
    expect(parseTime("12 PM")).toEqual({
      value: 0.5,
      format: "hh:mm a",
      jsDate: new Date(1899, 11, 30, 12, 0, 0),
    });
    expect(parseTime("6PM")).toEqual({
      value: 0.75,
      format: "hh:mm a",
      jsDate: new Date(1899, 11, 30, 18, 0, 0),
    });
    expect(parseTime("6   PM")).toEqual({
      value: 0.75,
      format: "hh:mm a",
      jsDate: new Date(1899, 11, 30, 18, 0, 0),
    });

    expect(parseTime("0:09 AM")).toEqual({
      value: 0.00625,
      format: "hh:mm a",
      jsDate: new Date(1899, 11, 30, 0, 9, 0),
    });
    expect(parseTime("12:09 AM")).toEqual({
      value: 0.00625,
      format: "hh:mm a",
      jsDate: new Date(1899, 11, 30, 0, 9, 0),
    });
    expect(parseTime("00012:00000009    AM")).toEqual({
      value: 0.00625,
      format: "hh:mm a",
      jsDate: new Date(1899, 11, 30, 0, 9, 0),
    });

    expect(parseTime("11:69 AM")).toEqual({
      value: 0.50625,
      format: "hh:mm a",
      jsDate: new Date(1899, 11, 30, 12, 9, 0),
    });
    expect(parseTime("18:00 AM")).toEqual({
      value: 0.25,
      format: "hh:mm a",
      jsDate: new Date(1899, 11, 30, 6, 0, 0),
    });
  });

  test("can detect and parse 'hh:mm:ss a' times", () => {
    expect(parseTime("12:00:00 AM")).toEqual({
      value: 0,
      format: "hh:mm:ss a",
      jsDate: new Date(1899, 11, 30, 0, 0, 0),
    });
    expect(parseTime("00:00:00 AM")).toEqual({
      value: 0,
      format: "hh:mm:ss a",
      jsDate: new Date(1899, 11, 30, 0, 0, 0),
    });
    expect(parseTime("12:00:00 PM")).toEqual({
      value: 0.5,
      format: "hh:mm:ss a",
      jsDate: new Date(1899, 11, 30, 12, 0, 0),
    });
    expect(parseTime("0:00:00 PM")).toEqual({
      value: 0.5,
      format: "hh:mm:ss a",
      jsDate: new Date(1899, 11, 30, 12, 0, 0),
    });
    expect(parseTime("12:08:06 AM")).toEqual({
      value: 0.005625,
      format: "hh:mm:ss a",
      jsDate: new Date(1899, 11, 30, 0, 8, 6),
    });
    expect(parseTime("12:8:6 AM")).toEqual({
      value: 0.005625,
      format: "hh:mm:ss a",
      jsDate: new Date(1899, 11, 30, 0, 8, 6),
    });
    expect(parseTime("12:008:006 AM")).toEqual({
      value: 0.005625,
      format: "hh:mm:ss a",
      jsDate: new Date(1899, 11, 30, 0, 8, 6),
    });
    expect(parseTime("11:59:546   AM")).toEqual({
      value: 0.505625,
      format: "hh:mm:ss a",
      jsDate: new Date(1899, 11, 30, 12, 8, 6),
    });
  });

  test("can detect and parse 'hhhh:mm:ss' times", () => {
    expect(parseTime("30:00")).toEqual({
      value: 1.25,
      format: "hhhh:mm:ss",
      jsDate: new Date(1899, 11, 31, 6, 0, 0),
    });
    expect(parseTime("24:08:06")).toEqual({
      value: 1.005625,
      format: "hhhh:mm:ss",
      jsDate: new Date(1899, 11, 31, 0, 8, 6),
    });
    expect(parseTime("36 AM")).toEqual({
      value: 1,
      format: "hhhh:mm:ss",
      jsDate: new Date(1899, 11, 31, 0, 0, 0),
    });
    expect(parseTime("24 PM")).toEqual({
      value: 1,
      format: "hhhh:mm:ss",
      jsDate: new Date(1899, 11, 31, 0, 0, 0),
    });
    expect(parseTime("36:09 AM")).toEqual({
      value: 1.00625,
      format: "hhhh:mm:ss",
      jsDate: new Date(1899, 11, 31, 0, 9, 0),
    });
    expect(parseTime("23:59:60 PM")).toEqual({
      value: 1,
      format: "hhhh:mm:ss",
      jsDate: new Date(1899, 11, 31, 0, 0, 0),
    });
  });
});

describe("formatTime", () => {
  test("hours minutes 'hh:mm'", () => {
    expect(formatTime(parseTime("0:0")!)).toBe("00:00");
    expect(formatTime(parseTime("6:0")!)).toBe("06:00");
    expect(formatTime(parseTime("12:9")!)).toBe("12:09");
    expect(formatTime(parseTime("00012:09")!)).toBe("12:09");
    expect(formatTime(parseTime("12:00000009")!)).toBe("12:09");
    expect(formatTime(parseTime("11:69")!)).toBe("12:09");

    expect(formatTime(parseTime("12:08:06")!, "hh:mm")).toBe("12:08");
    expect(formatTime(parseTime("05:09 PM")!, "hh:mm")).toBe("17:09");
    expect(formatTime(parseTime("012:008:006 AM")!, "hh:mm")).toBe("00:08");
    expect(formatTime(parseTime("30:00:00")!, "hh:mm")).toBe("06:00");
  });

  test("hours minutes seconds 'hh:mm:ss'", () => {
    expect(formatTime(parseTime("12:0:0")!)).toBe("12:00:00");
    expect(formatTime(parseTime("12:8:6")!)).toBe("12:08:06");
    expect(formatTime(parseTime("0012:008:006")!)).toBe("12:08:06");
    expect(formatTime(parseTime("11:59:546")!)).toBe("12:08:06");

    expect(formatTime(parseTime("12:08")!, "hh:mm:ss")).toBe("12:08:00");
    expect(formatTime(parseTime("05:09 PM")!, "hh:mm:ss")).toBe("17:09:00");
    expect(formatTime(parseTime("012:008:006 AM")!, "hh:mm:ss")).toBe("00:08:06");
    expect(formatTime(parseTime("30:00:00")!, "hh:mm:ss")).toBe("06:00:00");
  });

  test("hours minutes meridian 'hh:mm a", () => {
    expect(formatTime(parseTime("0 AM")!)).toBe("12:00 AM");
    expect(formatTime(parseTime("0 PM")!)).toBe("12:00 PM");
    expect(formatTime(parseTime("6AM")!)).toBe("06:00 AM");
    expect(formatTime(parseTime("6    AM")!)).toBe("06:00 AM");
    expect(formatTime(parseTime("7PM")!)).toBe("07:00 PM");
    expect(formatTime(parseTime("7    PM")!)).toBe("07:00 PM");
    expect(formatTime(parseTime("12 AM")!)).toBe("12:00 AM");
    expect(formatTime(parseTime("12 PM")!)).toBe("12:00 PM");
    expect(formatTime(parseTime("13 AM")!)).toBe("01:00 AM"); // @compatibility: on google sheets, parsing impposible
    expect(formatTime(parseTime("13 PM")!)).toBe("01:00 PM"); // @compatibility: on google sheets, parsing impposible
    expect(formatTime(parseTime("24 AM")!)).toBe("12:00 PM"); // @compatibility: on google sheets, parsing impposible
    expect(formatTime(parseTime("0:09 AM")!)).toBe("12:09 AM");
    expect(formatTime(parseTime("12:9 AM")!)).toBe("12:09 AM");
    expect(formatTime(parseTime("00012:0009 AM")!)).toBe("12:09 AM");
    expect(formatTime(parseTime("11:69 AM")!)).toBe("12:09 PM");
    expect(formatTime(parseTime("18:00 AM")!)).toBe("06:00 AM");

    expect(formatTime(parseTime("12:08")!, "hh:mm a")).toBe("12:08 PM");
    expect(formatTime(parseTime("12:08:06")!, "hh:mm a")).toBe("12:08 PM");
    expect(formatTime(parseTime("012:008:006 AM")!, "hh:mm a")).toBe("12:08 AM");
    expect(formatTime(parseTime("30:00:00")!, "hh:mm a")).toBe("06:00 AM");
  });

  test("hours minutes seconds meridian 'hh:mm:ss a", () => {
    expect(formatTime(parseTime("00:00:00 AM")!)).toBe("12:00:00 AM");
    expect(formatTime(parseTime("00:00:00 PM")!)).toBe("12:00:00 PM");
    expect(formatTime(parseTime("12:00:00 AM")!)).toBe("12:00:00 AM");
    expect(formatTime(parseTime("012:008:006 AM")!)).toBe("12:08:06 AM");
    expect(formatTime(parseTime("11:59:546   AM")!)).toBe("12:08:06 PM");

    expect(formatTime(parseTime("12:08")!, "hh:mm:ss a")).toBe("12:08:00 PM");
    expect(formatTime(parseTime("12:08:06")!, "hh:mm:ss a")).toBe("12:08:06 PM");
    expect(formatTime(parseTime("05:09 PM")!, "hh:mm:ss a")).toBe("05:09:00 PM");
    expect(formatTime(parseTime("30:00:00")!, "hh:mm:ss a")).toBe("06:00:00 AM");
  });

  test("duration 'hhhh:mm:ss", () => {
    expect(formatTime(parseTime("30:00")!)).toBe("30:00:00");
    expect(formatTime(parseTime("24:08:06")!)).toBe("24:08:06");
    expect(formatTime(parseTime("36:09 AM")!)).toBe("24:09:00"); // @compatibility: on google sheets, parsing impposible
    expect(formatTime(parseTime("24 PM")!)).toBe("24:00:00"); // @compatibility: on google sheets, parsing impposible
    expect(formatTime(parseTime("11:59:546   PM")!)).toBe("24:08:06");

    expect(formatTime(parseTime("12:08")!, "hhhh:mm:ss")).toBe("12:08:00");
    expect(formatTime(parseTime("12:08:06")!, "hhhh:mm:ss")).toBe("12:08:06");
    expect(formatTime(parseTime("05:09 PM")!, "hhhh:mm:ss")).toBe("17:09:00");
    expect(formatTime(parseTime("012:008:006 AM")!, "hhhh:mm:ss")).toBe("0:08:06");
  });
});
