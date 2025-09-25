import { pivotTimeAdapter } from "../../../src/helpers/pivot/pivot_time_adapter";
import {
  createDate,
  resetMapValueDimensionDate,
} from "../../../src/helpers/pivot/spreadsheet_pivot/date_spreadsheet_pivot";
import { DEFAULT_LOCALE, Locale } from "../../../src/types/locale";
import { PivotDimension } from "../../../src/types/pivot";

function createPivotDimension(granularity: string): PivotDimension {
  return {
    fieldName: "date",
    granularity,
    nameWithGranularity: "date:" + granularity,
    displayName: "Date",
    type: "date",
    isValid: true,
  };
}

const YEAR_DIMENSION = createPivotDimension("year");
const QUARTER_NUMBER_DIMENSION = createPivotDimension("quarter_number");
const MONTH_NUMBER_DIMENSION = createPivotDimension("month_number");
const ISO_WEEK_NUMBER_DIMENSION = createPivotDimension("iso_week_number");
const DAY_OF_MONTH_DIMENSION = createPivotDimension("day_of_month");
const DAY_OF_WEEK_DIMENSION = createPivotDimension("day_of_week");
const DAY_DIMENSION = createPivotDimension("day");
const HOUR_NUMBER_DIMENSION = createPivotDimension("hour_number");
const MINUTE_NUMBER_DIMENSION = createPivotDimension("minute_number");
const SECOND_NUMBER_DIMENSION = createPivotDimension("second_number");

describe("Date Spreadsheet Pivot", () => {
  beforeEach(() => {
    resetMapValueDimensionDate();
  });

  test("createDate with date values", () => {
    const d05_april_2024 = 45_387;

    expect(createDate(YEAR_DIMENSION, d05_april_2024, DEFAULT_LOCALE)).toBe(2024);
    expect(createDate(QUARTER_NUMBER_DIMENSION, d05_april_2024, DEFAULT_LOCALE)).toBe(2);
    expect(createDate(MONTH_NUMBER_DIMENSION, d05_april_2024, DEFAULT_LOCALE)).toBe(4);
    expect(createDate(ISO_WEEK_NUMBER_DIMENSION, d05_april_2024, DEFAULT_LOCALE)).toBe(14);
    expect(createDate(DAY_OF_MONTH_DIMENSION, d05_april_2024, DEFAULT_LOCALE)).toBe(5);
    expect(createDate(DAY_OF_WEEK_DIMENSION, d05_april_2024, DEFAULT_LOCALE)).toBe(6); // Friday
    expect(createDate(DAY_DIMENSION, d05_april_2024, DEFAULT_LOCALE)).toBe(d05_april_2024);
    expect(createDate(HOUR_NUMBER_DIMENSION, d05_april_2024, DEFAULT_LOCALE)).toBe(0);
    expect(createDate(MINUTE_NUMBER_DIMENSION, d05_april_2024, DEFAULT_LOCALE)).toBe(0);
    expect(createDate(SECOND_NUMBER_DIMENSION, d05_april_2024, DEFAULT_LOCALE)).toBe(0);

    const d04_may_2024 = 45_416;
    expect(createDate(YEAR_DIMENSION, d04_may_2024, DEFAULT_LOCALE)).toBe(2024);
    expect(createDate(QUARTER_NUMBER_DIMENSION, d04_may_2024, DEFAULT_LOCALE)).toBe(2);
    expect(createDate(MONTH_NUMBER_DIMENSION, d04_may_2024, DEFAULT_LOCALE)).toBe(5);
    expect(createDate(ISO_WEEK_NUMBER_DIMENSION, d04_may_2024, DEFAULT_LOCALE)).toBe(18);
    expect(createDate(DAY_OF_MONTH_DIMENSION, d04_may_2024, DEFAULT_LOCALE)).toBe(4);
    expect(createDate(DAY_OF_WEEK_DIMENSION, d04_may_2024, DEFAULT_LOCALE)).toBe(7); // Saturday
    expect(createDate(DAY_DIMENSION, d04_may_2024, DEFAULT_LOCALE)).toBe(d04_may_2024);
    expect(createDate(HOUR_NUMBER_DIMENSION, d04_may_2024, DEFAULT_LOCALE)).toBe(0);
    expect(createDate(MINUTE_NUMBER_DIMENSION, d04_may_2024, DEFAULT_LOCALE)).toBe(0);
    expect(createDate(SECOND_NUMBER_DIMENSION, d04_may_2024, DEFAULT_LOCALE)).toBe(0);

    const d01_january_2019 = 43_466;
    expect(createDate(YEAR_DIMENSION, d01_january_2019, DEFAULT_LOCALE)).toBe(2019);
    expect(createDate(QUARTER_NUMBER_DIMENSION, d01_january_2019, DEFAULT_LOCALE)).toBe(1);
    expect(createDate(MONTH_NUMBER_DIMENSION, d01_january_2019, DEFAULT_LOCALE)).toBe(1);
    expect(createDate(ISO_WEEK_NUMBER_DIMENSION, d01_january_2019, DEFAULT_LOCALE)).toBe(1);
    expect(createDate(DAY_OF_MONTH_DIMENSION, d01_january_2019, DEFAULT_LOCALE)).toBe(1);
    expect(createDate(DAY_OF_WEEK_DIMENSION, d01_january_2019, DEFAULT_LOCALE)).toBe(3); // Tuesday
    expect(createDate(DAY_DIMENSION, d01_january_2019, DEFAULT_LOCALE)).toBe(d01_january_2019);
    expect(createDate(HOUR_NUMBER_DIMENSION, d01_january_2019, DEFAULT_LOCALE)).toBe(0);
    expect(createDate(MINUTE_NUMBER_DIMENSION, d01_january_2019, DEFAULT_LOCALE)).toBe(0);
    expect(createDate(SECOND_NUMBER_DIMENSION, d01_january_2019, DEFAULT_LOCALE)).toBe(0);
  });

  test("createDate with datetime values", () => {
    const d05_april_2024_3h_7m_12s = 45_387.13;

    expect(createDate(YEAR_DIMENSION, d05_april_2024_3h_7m_12s, DEFAULT_LOCALE)).toBe(2024);
    expect(createDate(QUARTER_NUMBER_DIMENSION, d05_april_2024_3h_7m_12s, DEFAULT_LOCALE)).toBe(2);
    expect(createDate(MONTH_NUMBER_DIMENSION, d05_april_2024_3h_7m_12s, DEFAULT_LOCALE)).toBe(4);
    expect(createDate(ISO_WEEK_NUMBER_DIMENSION, d05_april_2024_3h_7m_12s, DEFAULT_LOCALE)).toBe(
      14
    );
    expect(createDate(DAY_OF_MONTH_DIMENSION, d05_april_2024_3h_7m_12s, DEFAULT_LOCALE)).toBe(5);
    expect(createDate(DAY_OF_WEEK_DIMENSION, d05_april_2024_3h_7m_12s, DEFAULT_LOCALE)).toBe(6); // Friday
    expect(createDate(DAY_DIMENSION, d05_april_2024_3h_7m_12s, DEFAULT_LOCALE)).toBe(45_387);
    expect(createDate(HOUR_NUMBER_DIMENSION, d05_april_2024_3h_7m_12s, DEFAULT_LOCALE)).toBe(3);
    expect(createDate(MINUTE_NUMBER_DIMENSION, d05_april_2024_3h_7m_12s, DEFAULT_LOCALE)).toBe(7);
    expect(createDate(SECOND_NUMBER_DIMENSION, d05_april_2024_3h_7m_12s, DEFAULT_LOCALE)).toBe(12);
  });

  test("createDate with null values", () => {
    expect(createDate(YEAR_DIMENSION, null, DEFAULT_LOCALE)).toBeNull();
    expect(createDate(QUARTER_NUMBER_DIMENSION, null, DEFAULT_LOCALE)).toBeNull();
    expect(createDate(MONTH_NUMBER_DIMENSION, null, DEFAULT_LOCALE)).toBeNull();
    expect(createDate(ISO_WEEK_NUMBER_DIMENSION, null, DEFAULT_LOCALE)).toBeNull();
    expect(createDate(DAY_OF_MONTH_DIMENSION, null, DEFAULT_LOCALE)).toBeNull();
    expect(createDate(DAY_OF_WEEK_DIMENSION, null, DEFAULT_LOCALE)).toBeNull();
    expect(createDate(DAY_DIMENSION, null, DEFAULT_LOCALE)).toBeNull();
    expect(createDate(HOUR_NUMBER_DIMENSION, null, DEFAULT_LOCALE)).toBeNull();
    expect(createDate(MINUTE_NUMBER_DIMENSION, null, DEFAULT_LOCALE)).toBeNull();
    expect(createDate(SECOND_NUMBER_DIMENSION, null, DEFAULT_LOCALE)).toBeNull();
  });

  test("createDate throw with unknown granularity", () => {
    const unknownGranularity = "unknown_granularity";
    expect(() => createDate(createPivotDimension(unknownGranularity), 0, DEFAULT_LOCALE)).toThrow(
      `Unknown date granularity: ${unknownGranularity}`
    );
  });

  test.each([
    // [weekStart, [Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday]]
    [1, [7, 1, 2, 3, 4, 5, 6]],
    [2, [6, 7, 1, 2, 3, 4, 5]],
    [3, [5, 6, 7, 1, 2, 3, 4]],
    [4, [4, 5, 6, 7, 1, 2, 3]],
    [5, [3, 4, 5, 6, 7, 1, 2]],
    [6, [2, 3, 4, 5, 6, 7, 1]],
    [7, [1, 2, 3, 4, 5, 6, 7]],
  ])("Day of week with week start", (weekStart: number, expected: number[]) => {
    resetMapValueDimensionDate();
    const d31_march_2024 = 45_382; // Sunday
    const d01_april_2024 = 45_383; // Monday
    const d02_april_2024 = 45_384; // Tuesday
    const d03_april_2024 = 45_385; // Wednesday
    const d04_april_2024 = 45_386; // Thursday
    const d05_april_2024 = 45_387; // Friday
    const d06_april_2024 = 45_388; // Saturday

    const locale = { ...DEFAULT_LOCALE, weekStart };
    expect(createDate(DAY_OF_WEEK_DIMENSION, d31_march_2024, locale)).toBe(expected[0]);
    expect(createDate(DAY_OF_WEEK_DIMENSION, d01_april_2024, locale)).toBe(expected[1]);
    expect(createDate(DAY_OF_WEEK_DIMENSION, d02_april_2024, locale)).toBe(expected[2]);
    expect(createDate(DAY_OF_WEEK_DIMENSION, d03_april_2024, locale)).toBe(expected[3]);
    expect(createDate(DAY_OF_WEEK_DIMENSION, d04_april_2024, locale)).toBe(expected[4]);
    expect(createDate(DAY_OF_WEEK_DIMENSION, d05_april_2024, locale)).toBe(expected[5]);
    expect(createDate(DAY_OF_WEEK_DIMENSION, d06_april_2024, locale)).toBe(expected[6]);
  });

  test.each([1, 2, 3, 4, 5, 6, 7])("Day of week with different locales", (weekStart: number) => {
    resetMapValueDimensionDate();
    function getValue(date: number, locale: Locale) {
      const normalizedValue = createDate(DAY_OF_WEEK_DIMENSION, date, locale);
      return pivotTimeAdapter("day_of_week").toValueAndFormat(normalizedValue, locale).value;
    }

    const d31_march_2024 = 45_382; // Sunday
    const d01_april_2024 = 45_383; // Monday
    const d02_april_2024 = 45_384; // Tuesday
    const d03_april_2024 = 45_385; // Wednesday
    const d04_april_2024 = 45_386; // Thursday
    const d05_april_2024 = 45_387; // Friday
    const d06_april_2024 = 45_388; // Saturday

    const locale = { ...DEFAULT_LOCALE, weekStart };
    expect(getValue(d31_march_2024, locale)).toBe("Sunday");
    expect(getValue(d01_april_2024, locale)).toBe("Monday");
    expect(getValue(d02_april_2024, locale)).toBe("Tuesday");
    expect(getValue(d03_april_2024, locale)).toBe("Wednesday");
    expect(getValue(d04_april_2024, locale)).toBe("Thursday");
    expect(getValue(d05_april_2024, locale)).toBe("Friday");
    expect(getValue(d06_april_2024, locale)).toBe("Saturday");
  });
});
