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
const MONTH_NUMBER_DIMENSION = createPivotDimension("month_number");
const DAY_OF_MONTH_DIMENSION = createPivotDimension("day_of_month");
const DAY_DIMENSION = createPivotDimension("day");

describe("Date Spreadsheet Pivot", () => {
  test("createDate with date values", () => {
    const d05_april_2024 = 45_387;

    expect(createDate(YEAR_NUMBER_DIMENSION, d05_april_2024, DEFAULT_LOCALE)).toBe(2024);
    expect(createDate(MONTH_NUMBER_DIMENSION, d05_april_2024, DEFAULT_LOCALE)).toBe(3);
    expect(createDate(DAY_OF_MONTH_DIMENSION, d05_april_2024, DEFAULT_LOCALE)).toBe(5);
    expect(createDate(DAY_DIMENSION, d05_april_2024, DEFAULT_LOCALE)).toBe(d05_april_2024);

    const d04_may_2024 = 45_416;
    expect(createDate(YEAR_NUMBER_DIMENSION, d04_may_2024, DEFAULT_LOCALE)).toBe(2024);
    expect(createDate(MONTH_NUMBER_DIMENSION, d04_may_2024, DEFAULT_LOCALE)).toBe(4);
    expect(createDate(DAY_OF_MONTH_DIMENSION, d04_may_2024, DEFAULT_LOCALE)).toBe(4);
    expect(createDate(DAY_DIMENSION, d04_may_2024, DEFAULT_LOCALE)).toBe(d04_may_2024);

    const d01_january_2019 = 43_466;
    expect(createDate(YEAR_NUMBER_DIMENSION, d01_january_2019, DEFAULT_LOCALE)).toBe(2019);
    expect(createDate(MONTH_NUMBER_DIMENSION, d01_january_2019, DEFAULT_LOCALE)).toBe(0);
    expect(createDate(DAY_OF_MONTH_DIMENSION, d01_january_2019, DEFAULT_LOCALE)).toBe(1);
    expect(createDate(DAY_DIMENSION, d01_january_2019, DEFAULT_LOCALE)).toBe(d01_january_2019);
  });

  test("createDate with datetime values", () => {
    const d05_april_2024_15h = 45_387.13;

    expect(createDate(YEAR_NUMBER_DIMENSION, d05_april_2024_15h, DEFAULT_LOCALE)).toBe(2024);
    expect(createDate(MONTH_NUMBER_DIMENSION, d05_april_2024_15h, DEFAULT_LOCALE)).toBe(3);
    expect(createDate(DAY_OF_MONTH_DIMENSION, d05_april_2024_15h, DEFAULT_LOCALE)).toBe(5);
    expect(createDate(DAY_DIMENSION, d05_april_2024_15h, DEFAULT_LOCALE)).toBe(
      Math.floor(d05_april_2024_15h)
    );
  });

  test("createDate throw with unknown granularity", () => {
    const unknownGranularity = "unknown_granularity";
    expect(() => createDate(createPivotDimension(unknownGranularity), 0, DEFAULT_LOCALE)).toThrow(
      `Unknown date granularity: ${unknownGranularity}`
    );
  });
});
