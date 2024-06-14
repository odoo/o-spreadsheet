import { createDate } from "../../../src/helpers/pivot/spreadsheet_pivot/date_spreadsheet_pivot";
import { DEFAULT_LOCALE } from "../../../src/types/locale";
import { PivotDimension } from "../../../src/types/pivot";

function createPivotDimension(granularity: string): PivotDimension {
  return {
    name: "date",
    granularity,
    nameWithGranularity: "date:" + granularity,
    displayName: "Date",
    type: "date",
    isValid: true,
  };
}

const YEAR_NUMBER_DIMENSION = createPivotDimension("year_number");
const QUARTER_NUMBER_DIMENSION = createPivotDimension("quarter_number");
const MONTH_NUMBER_DIMENSION = createPivotDimension("month_number");
const ISO_WEEK_NUMBER_DIMENSION = createPivotDimension("iso_week_number");
const DAY_OF_MONTH_DIMENSION = createPivotDimension("day_of_month");
const DAY_DIMENSION = createPivotDimension("day");

describe("Date Spreadsheet Pivot", () => {
  test("createDate with date values", () => {
    const d05_april_2024 = 45_387;

    expect(createDate(YEAR_NUMBER_DIMENSION, d05_april_2024, DEFAULT_LOCALE)).toBe(2024);
    expect(createDate(QUARTER_NUMBER_DIMENSION, d05_april_2024, DEFAULT_LOCALE)).toBe(2);
    expect(createDate(MONTH_NUMBER_DIMENSION, d05_april_2024, DEFAULT_LOCALE)).toBe(4);
    expect(createDate(ISO_WEEK_NUMBER_DIMENSION, d05_april_2024, DEFAULT_LOCALE)).toBe(14);
    expect(createDate(DAY_OF_MONTH_DIMENSION, d05_april_2024, DEFAULT_LOCALE)).toBe(5);
    expect(createDate(DAY_DIMENSION, d05_april_2024, DEFAULT_LOCALE)).toBe(45_387);

    const d04_may_2024 = 45_416;
    expect(createDate(YEAR_NUMBER_DIMENSION, d04_may_2024, DEFAULT_LOCALE)).toBe(2024);
    expect(createDate(QUARTER_NUMBER_DIMENSION, d04_may_2024, DEFAULT_LOCALE)).toBe(2);
    expect(createDate(MONTH_NUMBER_DIMENSION, d04_may_2024, DEFAULT_LOCALE)).toBe(5);
    expect(createDate(ISO_WEEK_NUMBER_DIMENSION, d04_may_2024, DEFAULT_LOCALE)).toBe(18);
    expect(createDate(DAY_OF_MONTH_DIMENSION, d04_may_2024, DEFAULT_LOCALE)).toBe(4);
    expect(createDate(DAY_DIMENSION, d04_may_2024, DEFAULT_LOCALE)).toBe(45_416);

    const d01_january_2019 = 43_466;
    expect(createDate(YEAR_NUMBER_DIMENSION, d01_january_2019, DEFAULT_LOCALE)).toBe(2019);
    expect(createDate(QUARTER_NUMBER_DIMENSION, d01_january_2019, DEFAULT_LOCALE)).toBe(1);
    expect(createDate(MONTH_NUMBER_DIMENSION, d01_january_2019, DEFAULT_LOCALE)).toBe(1);
    expect(createDate(ISO_WEEK_NUMBER_DIMENSION, d01_january_2019, DEFAULT_LOCALE)).toBe(1);
    expect(createDate(DAY_OF_MONTH_DIMENSION, d01_january_2019, DEFAULT_LOCALE)).toBe(1);
    expect(createDate(DAY_DIMENSION, d01_january_2019, DEFAULT_LOCALE)).toBe(43_466);
  });

  test("createDate with datetime values", () => {
    const d05_april_2024_15h = 45_387.13;

    expect(createDate(YEAR_NUMBER_DIMENSION, d05_april_2024_15h, DEFAULT_LOCALE)).toBe(2024);
    expect(createDate(QUARTER_NUMBER_DIMENSION, d05_april_2024_15h, DEFAULT_LOCALE)).toBe(2);
    expect(createDate(MONTH_NUMBER_DIMENSION, d05_april_2024_15h, DEFAULT_LOCALE)).toBe(4);
    expect(createDate(ISO_WEEK_NUMBER_DIMENSION, d05_april_2024_15h, DEFAULT_LOCALE)).toBe(14);
    expect(createDate(DAY_OF_MONTH_DIMENSION, d05_april_2024_15h, DEFAULT_LOCALE)).toBe(5);
    expect(createDate(DAY_DIMENSION, d05_april_2024_15h, DEFAULT_LOCALE)).toBe(45_387);
  });

  test("createDate throw with unknown granularity", () => {
    const unknownGranularity = "unknown_granularity";
    expect(() => createDate(createPivotDimension(unknownGranularity), 0, DEFAULT_LOCALE)).toThrow(
      `Unknown date granularity: ${unknownGranularity}`
    );
  });
});
