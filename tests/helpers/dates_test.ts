import { parseDate, toNativeDate, formatDate } from "../../src/helpers/index";

const CURRENT_YEAR = new Date().getFullYear();

describe("date helpers", () => {
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
