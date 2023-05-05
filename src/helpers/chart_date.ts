import { TimeScale } from "chart.js";
import { parseDateTime } from ".";
import { Alias, Format, Locale } from "../types";

// -----------------------------------------------------------------------------
// File for helpers needed to use time axis in ChartJS
// -----------------------------------------------------------------------------

type MomentJSFormat = string & Alias;
type TimeUnit = "year" | "month" | "day" | "hour" | "minute" | "second";

const UNIT_LENGTH: Record<TimeUnit, number> = {
  second: 1000,
  minute: 1000 * 60,
  hour: 1000 * 3600,
  day: 1000 * 3600 * 24,
  month: 1000 * 3600 * 24 * 30,
  year: 1000 * 3600 * 24 * 365,
};

const Milliseconds = {
  inSeconds: function (milliseconds: number) {
    return Math.floor(milliseconds / UNIT_LENGTH.second);
  },
  inMinutes: function (milliseconds: number) {
    return Math.floor(milliseconds / UNIT_LENGTH.minute);
  },
  inHours: function (milliseconds: number) {
    return Math.floor(milliseconds / UNIT_LENGTH.hour);
  },
  inDays: function (milliseconds: number) {
    return Math.floor(milliseconds / UNIT_LENGTH.day);
  },
  inMonths: function (milliseconds: number) {
    return Math.floor(milliseconds / UNIT_LENGTH.month);
  },
  inYears: function (milliseconds: number) {
    return Math.floor(milliseconds / UNIT_LENGTH.year);
  },
};

/**
 * Regex to test if a format string is a date format that can be translated into a moment time format
 */
export const timeFormatMomentCompatible =
  /^((d|dd|m|mm|yyyy|yy|hh|h|ss|a)(-|:|\s|\/))*(d|dd|m|mm|yyyy|yy|hh|h|ss|a)$/i;

/** Get the time options for the XAxis of ChartJS */
export function getChartTimeOptions(
  labels: string[],
  labelFormat: Format,
  locale: Locale
): TimeScale {
  const momentFormat = convertDateFormatForMoment(labelFormat);

  const timeUnit = getBestTimeUnitForScale(labels, momentFormat, locale);
  const displayFormats = {};
  if (timeUnit) {
    displayFormats[timeUnit] = momentFormat;
  }

  return {
    parser: momentFormat,
    displayFormats,
    unit: timeUnit,
  };
}

/**
 * Convert the given date format into a format that moment.js understands.
 *
 * https://momentjs.com/docs/#/parsing/string-format/
 */
function convertDateFormatForMoment(format: Format): MomentJSFormat {
  format = format.replace(/y/g, "Y");
  format = format.replace(/d/g, "D");

  // "m" before "h" == month, "m" after "h" == minute
  const indexH = format.indexOf("h");
  if (indexH >= 0) {
    format = format.slice(0, indexH).replace(/m/g, "M") + format.slice(indexH);
  } else {
    format = format.replace(/m/g, "M");
  }

  // If we have an "a", we should display hours as AM/PM (h), otherwise display 24 hours format (H)
  if (!format.includes("a")) {
    format = format.replace(/h/g, "H");
  }

  return format;
}

/** Get the minimum time unit that the format is able to display */
function getFormatMinDisplayUnit(format: MomentJSFormat): TimeUnit {
  if (format.includes("s")) {
    return "second";
  } else if (format.includes("m")) {
    return "minute";
  } else if (format.includes("h") || format.includes("H")) {
    return "hour";
  } else if (format.includes("D")) {
    return "day";
  } else if (format.includes("M")) {
    return "month";
  }
  return "year";
}

/**
 * Returns the best time unit that should be used for the X axis of a chart in order to display all
 * the labels correctly.
 *
 * There is two conditions :
 *  - the format of the labels should be able to display the unit. For example if the format is "DD/MM/YYYY"
 *    it makes no sense to try to use minutes in the X axis
 *  - we want the "best fit" unit. For example if the labels span a period of several days, we want to use days
 *    as a unit, but if they span 200 days, we'd like to use months instead
 *
 */
function getBestTimeUnitForScale(
  labels: string[],
  format: MomentJSFormat,
  locale: Locale
): TimeUnit | undefined {
  const labelDates = labels.map((label) => parseDateTime(label, locale)?.jsDate);
  if (labelDates.some((date) => date === undefined) || labels.length < 2) {
    return undefined;
  }
  const labelsTimestamps = labelDates.map((date) => date!.getTime());
  const period = Math.max(...labelsTimestamps) - Math.min(...labelsTimestamps);

  const minUnit = getFormatMinDisplayUnit(format);

  if (UNIT_LENGTH.second >= UNIT_LENGTH[minUnit] && Milliseconds.inSeconds(period) < 180) {
    return "second";
  } else if (UNIT_LENGTH.minute >= UNIT_LENGTH[minUnit] && Milliseconds.inMinutes(period) < 180) {
    return "minute";
  } else if (UNIT_LENGTH.hour >= UNIT_LENGTH[minUnit] && Milliseconds.inHours(period) < 96) {
    return "hour";
  } else if (UNIT_LENGTH.day >= UNIT_LENGTH[minUnit] && Milliseconds.inDays(period) < 90) {
    return "day";
  } else if (UNIT_LENGTH.month >= UNIT_LENGTH[minUnit] && Milliseconds.inMonths(period) < 36) {
    return "month";
  }
  return "year";
}
