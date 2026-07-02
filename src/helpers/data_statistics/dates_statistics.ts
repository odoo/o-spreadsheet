import { _t } from "../../translation";
import { Getters } from "../../types/getters";
import { DateTime, jsDateToRoundNumber, numberToJsDate } from "../dates";
import { item, StatItem, valueInterpretation } from "./statistics_items";

export type DateGranularity = "weekday" | "date" | "week" | "month" | "year";

export const DATE_GRANULARITY_LABELS: Record<DateGranularity, string> = {
  weekday: _t("Day of week"),
  date: _t("Exact date"),
  week: _t("Week"),
  month: _t("Month"),
  year: _t("Year"),
};

export const interpretMedianDate = (
  median: number,
  min?: number,
  max?: number
): valueInterpretation | undefined => {
  if (min === undefined || max === undefined || max === min) {
    return undefined;
  }
  const ratio = (median - min) / (max - min);
  if (ratio >= 0.65) {
    return {
      main: _t(
        "Data is heavily concentrated towards the end of the period. Recent activity is higher."
      ),
    };
  }
  if (ratio <= 0.35) {
    return {
      main: _t(
        "Data is heavily concentrated at the beginning of the period. Activity has slowed down since."
      ),
    };
  }
  return { main: _t("Activity is steady and evenly distributed across the entire period.") };
};

/** Groups a date serial by the requested granularity: exact day, day-of-week, week/month/year start. */
function dateGranularityKey(serial: number, granularity: DateGranularity): number {
  const date = numberToJsDate(serial);
  switch (granularity) {
    case "weekday":
      return date.getDay();
    case "week": {
      const mondayOffset = (date.getDay() + 6) % 7;
      return serial - mondayOffset;
    }
    case "month":
      return jsDateToRoundNumber(new DateTime(date.getFullYear(), date.getMonth(), 1));
    case "year":
      return jsDateToRoundNumber(new DateTime(date.getFullYear(), 0, 1));
    case "date":
    default:
      return serial;
  }
}

/**
 * Most frequent bucket of dates for the given granularity, along with a serial representative of
 * that bucket (the bucket start for date/week/month/year, any matching serial for weekday) and the
 * ratio of values falling in it. Undefined if no bucket has more than one value.
 */
function mostFrequentByGranularity(
  dateSerials: number[],
  granularity: DateGranularity
): { serial: number; count: number; ratio: number } | undefined {
  if (!dateSerials.length) {
    return undefined;
  }
  const counts = new Map<number, { serial: number; count: number }>();
  for (const serial of dateSerials) {
    const key = dateGranularityKey(serial, granularity);
    const entry = counts.get(key);
    if (entry) {
      entry.count++;
    } else {
      counts.set(key, { serial: granularity === "weekday" ? serial : key, count: 1 });
    }
  }
  let best: { serial: number; count: number } | undefined;
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) {
      best = entry;
    }
  }
  return best && best.count > 1 ? { ...best, ratio: best.count / dateSerials.length } : undefined;
}

/** Builds the "most frequent" stat item for a date column at the requested granularity. */
export function mostFrequentDateItem(
  getters: Getters,
  sheetId: string,
  range: string,
  serials: number[],
  granularity: DateGranularity
): StatItem | undefined {
  const mode = mostFrequentByGranularity(serials, granularity);
  if (!mode) {
    return undefined;
  }
  switch (granularity) {
    case "weekday":
      return item(
        getters,
        sheetId,
        _t("Most common day"),
        `=TEXT(${literalForFormula(mode.serial)},"dddd")`,
        _t("%s% of the dates fall on this day of the week.", Math.round(mode.ratio * 100))
      );
    case "week":
      return item(
        getters,
        sheetId,
        _t("Most frequent week"),
        `=TEXT(${literalForFormula(mode.serial)},"dd/mm/yyyy")`,
        _t("The week starting on this date appears %s times, more than any other week.", mode.count)
      );
    case "month":
      return item(
        getters,
        sheetId,
        _t("Most frequent month"),
        `=TEXT(${literalForFormula(mode.serial)},"mmmm yyyy")`,
        _t("Appears %s times, more than any other month.", mode.count)
      );
    case "year":
      return item(
        getters,
        sheetId,
        _t("Most frequent year"),
        `=TEXT(${literalForFormula(mode.serial)},"yyyy")`,
        _t("Appears %s times, more than any other year.", mode.count)
      );
    case "date":
    default:
      return item(
        getters,
        sheetId,
        _t("Most frequent date"),
        `=INDEX(${range},MATCH(${literalForFormula(mode.serial)},${range},0),1)`,
        _t("Appears %s times, more than any other date.", mode.count)
      );
  }
}

/** Wraps a date formula so it's displayed at the requested granularity (day/week/month/year). */
export function atDateGranularity(expr: string, granularity: DateGranularity): string {
  switch (granularity) {
    case "week":
      return `=TEXT(${expr}-WEEKDAY(${expr},2)+1,"dd/mm/yyyy")`;
    case "month":
      return `=TEXT(${expr},"mmmm yyyy")`;
    case "year":
      return `=TEXT(${expr},"yyyy")`;
    case "weekday":
    case "date":
    default:
      return `=${expr}`;
  }
}

function literalForFormula(serial: number) {
  throw new Error("Function not implemented.");
}
