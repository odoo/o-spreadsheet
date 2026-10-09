import { _t } from "../../translation";
import { EvaluatedCell } from "../../types/cells";
import { Getters } from "../../types/getters";
import { numberToJsDate } from "../dates";
import { DAYS, MONTHS } from "../format/format";
import { toTrimmedLowerCase } from "../text_helper";
import { zoneToXc } from "../zones";
import { ColumnAnalysis } from "./data_analysis";
import {
  createStatItem,
  DateSections,
  getStatIdForDay,
  getStatIdForMonth,
  getStatIdForYear,
  StatValue,
} from "./statistics_items";

const ALL_TYPES = ["number", "percentage", "date", "text", "boolean", "label", "categorical"];
const NUMERIC_TYPES = ["number", "percentage"];

interface StatItemConfig {
  id: string;
  getName: (type: string) => string;
  formula: (range: string) => string;
  types: string[];
}

export function generateItemIdFromValue(value: any) {
  return toTrimmedLowerCase(String(value));
}

const GENERIC_STAT_ITEMS: StatItemConfig[] = [
  {
    id: "non_empty",
    getName: () => _t("Non-empty cells"),
    formula: (range) => `=COUNTA(${range})`,
    types: ALL_TYPES,
  },
  {
    id: "unique",
    getName: () => _t("Unique values"),
    formula: (range) => `=COUNTUNIQUE(${range})`,
    types: ALL_TYPES,
  },
  {
    id: "sum",
    getName: () => _t("Sum"),
    formula: (range) => `=SUM(${range})`,
    types: NUMERIC_TYPES,
  },
  {
    id: "median",
    getName: () => _t("Median"),
    formula: (range) => `=MEDIAN(${range})`,
    types: [...NUMERIC_TYPES, "date"],
  },
  {
    id: "average",
    getName: () => _t("Average"),
    formula: (range) => `=AVERAGE(${range})`,
    types: [...NUMERIC_TYPES, "date"],
  },
  {
    id: "min",
    getName: (type) => (type === "date" ? _t("Earliest date") : _t("Minimum value")),
    formula: (range) => `=MIN(${range})`,
    types: [...NUMERIC_TYPES, "date"],
  },
  {
    id: "max",
    getName: (type) => (type === "date" ? _t("Latest date") : _t("Maximum value")),
    formula: (range) => `=MAX(${range})`,
    types: [...NUMERIC_TYPES, "date"],
  },
];

const isNonZero = (item: StatValue) => {
  const cleanedValue = String(item.value).replace(/[^0-9-.]/g, "");
  return cleanedValue !== "0.00";
};

export function buildGeneralStatItems(
  getters: Getters,
  col: ColumnAnalysis,
  sheetId: string
): StatValue[] {
  const zone = col.headerInZone ? { ...col.zone, top: col.zone.top + 1 } : col.zone;
  const range = zoneToXc(zone);
  return GENERIC_STAT_ITEMS.map((item) => {
    const name = item.getName(col.type);
    return item.types.includes(col.type)
      ? createStatItem(getters, sheetId, { id: item.id, name, formula: item.formula(range) })
      : { id: item.id, name, formula: "", value: "—" };
  });
}

/** Pattern A + B + D + E — Single number/percentage or categorical/label column: general stats + occurrences per value. */
export function buildOccurrencesItems(
  getters: Getters,
  col: ColumnAnalysis,
  sheetId: string
): StatValue[] {
  const zone = col.headerInZone ? { ...col.zone, top: col.zone.top + 1 } : col.zone;
  const range = zoneToXc(zone);
  const count: Map<string, number> = new Map();
  const vals = getters.getEvaluatedCellsInZone(sheetId, zone);
  for (const cell of vals) {
    const key = generateItemIdFromValue(cell.value);
    count.set(key, (count.get(key) ?? 0) + 1);
  }
  const items = uniqueValues(col.nonEmpty)
    .filter(({ formattedValue }) => formattedValue !== "")
    .map(({ value, formattedValue }) =>
      createStatItem(getters, sheetId, {
        id: generateItemIdFromValue(value),
        name: formattedValue,
        formula: `=COUNTIF(${range},"${value}")`,
        computedValue: {
          value: count.get(generateItemIdFromValue(value)) ?? 0,
        },
      })
    );
  return withPercentages(items, col.nonEmpty.length);
}

export function buildCategorySumItems(
  getters: Getters,
  colCategories: ColumnAnalysis,
  colValues: ColumnAnalysis,
  sheetId: string
): StatValue[] {
  if (!colCategories || !colValues) {
    return [];
  }
  const zoneCat = colCategories.headerInZone
    ? { ...colCategories.zone, top: colCategories.zone.top + 1 }
    : colCategories.zone;
  const zoneVal = colValues.headerInZone
    ? { ...colValues.zone, top: colValues.zone.top + 1 }
    : colValues.zone;
  const rangeCategories = zoneToXc(zoneCat);
  const rangeValues = zoneToXc(zoneVal);
  const sumMap: Map<string, number> = new Map();
  const catsVals = getters.getEvaluatedCellsInZone(sheetId, zoneCat);
<<<<<<< HEAD
  const moneyVals = getters.getEvaluatedCellsInZone(sheetId, zoneVal);
  const moneyFormat = moneyVals.find((cell) => cell?.format)?.format;
  for (let i = 0; i < catsVals.length; i++) {
    const catCell = catsVals[i];
    const moneyCell = moneyVals[i];
    if (!catCell || !moneyCell) {
      continue;
    }
    const key = toTrimmedLowerCase(String(catCell.value));
    const amount = Number(moneyCell.value);
    const validAmount = isNaN(amount) ? 0 : amount;
    sumMap.set(key, (sumMap.get(key) ?? 0) + validAmount);
  }
  return uniqueValues(colCategories.nonEmpty)
    .filter(({ formattedValue }) => formattedValue !== "")
    .map(({ value, formattedValue }) =>
      createStatItem(getters, sheetId, {
        id: generateItemIdFromValue(value),
        name: formattedValue,
        formula: `=SUMIF(${rangeCategories},"${value}",${rangeValues})`,
        computedValue: {
          value: sumMap.get(toTrimmedLowerCase(String(value))) ?? 0,
=======
  const somethingElseThanMoneyFindAGoodName = getters.getEvaluatedCellsInZone(sheetId, zoneVal);


// TODO MAWAT: try with javascritp group by
// const allValuesByCategory=[
  {category: value}, {category:value}, etc.
]
const allGroupedByCategory = Object.groupBy(allValuesByCategory, (item) => item.category);
// {"category1": [...], "category2": [...], ...}


  const moneyFormat = somethingElseThanMoneyFindAGoodName.find((cell) => cell?.format)?.format;
  for (let i = 0; i < catsVals.length; i++) {
    const catCell = catsVals[i];
    const moneyCell = somethingElseThanMoneyFindAGoodName[i];
    if (!catCell || !moneyCell) {
      continue;
    }
    const key = toTrimmedLowerCase(String(catCell.value));  // sure?
    const amount = Number(moneyCell.value);
    const validAmount = isNaN(amount) ? 0 : amount;
    sumMap.set(
      key, (sumMap.get(key) ?? 0) + validAmount
      //category1: {value: valueCategory1, categoryText: catCell.value},
    );
  }

  return uniqueValues(colCategories.nonEmpty)
    .filter(({ formattedValue }) => formattedValue !== "")
    .map(({ value: category, formattedValue }) =>
      createStatItem(getters, sheetId, {
        id: generateItemIdFromValue(category),
        name: formattedValue,
        formula: `=SUMIF(${rangeCategories},"${category}",${rangeValues})`,
        computedValue: {
          value: sumMap.get(toTrimmedLowerCase(String(category))) ?? 0,
>>>>>>> a1c3f1ba19 (first review with VSC)
        },
        format: moneyFormat,
      })
    )
    .filter(isNonZero);
}

function uniqueValues(
  cells: EvaluatedCell[]
): { value: string | number | boolean | null; formattedValue: string }[] {
  const normalizedValues = new Set<string>();
  const uniqueValuesList: { value: string | number | boolean | null; formattedValue: string }[] =
    [];
  for (const cell of cells) {
    const { value, formattedValue } = cell;
    const normalizedValue = toTrimmedLowerCase(String(value));
    if (!normalizedValues.has(normalizedValue)) {
      normalizedValues.add(normalizedValue);
      uniqueValuesList.push({ value, formattedValue });
    }
  }
  return uniqueValuesList;
}

export function buildBooleanItems(
  getters: Getters,
  col: ColumnAnalysis,
  sheetId: string
): StatValue[] {
  const zone = col.headerInZone ? { ...col.zone, top: col.zone.top + 1 } : col.zone;
  const range = zoneToXc(zone);
  const items = [
    createStatItem(getters, sheetId, {
      id: "true",
      name: _t("TRUE"),
      formula: `=COUNTIF(${range},TRUE)`,
    }),
    createStatItem(getters, sheetId, {
      id: "false",
      name: _t("FALSE"),
      formula: `=COUNTIF(${range},FALSE)`,
    }),
  ];
  return withPercentages(items, col.nonEmpty.length);
}

/** Pattern C — Single date column */
export function buildDateStatSections(
  getters: Getters,
  col: ColumnAnalysis,
  sheetId: string
): DateSections {
  const zone = col.headerInZone ? { ...col.zone, top: col.zone.top + 1 } : col.zone;
  const range = zoneToXc(zone);
  const dateValues = col.nonEmpty
    .map((cell) => cell.value)
    .filter((value): value is number => typeof value === "number");
  const earliestYear = numberToJsDate(Math.min(...dateValues)).getFullYear();
  const latestYear = numberToJsDate(Math.max(...dateValues)).getFullYear();
  const yearRange = Array.from(
    { length: latestYear - earliestYear + 1 },
    (_, i) => earliestYear + i
  );
  const yearItems = yearRange.map((year) =>
    createStatItem(getters, sheetId, {
      id: String(year),
      name: getStatIdForYear(year),
      formula: `=SUM(COUNTIF(YEAR(${range}),${year}))`,
    })
  );
  const monthItems = Object.entries(MONTHS).map(([month, name]) =>
    createStatItem(getters, sheetId, {
      id: getStatIdForMonth(month),
      name: name.toString(),
      formula: `=COUNTIF(FILTER(MONTH(${range}), ${range}), ${Number(month) + 1})`,
    })
  );
  const locale = getters.getLocale();
  const firstDayOfWeek = locale.weekStart;
  const offset = firstDayOfWeek % 7;
  const dayItems: StatValue[] = [];
  for (let i = 0; i < 7; i++) {
    const day = (i + offset) % 7;
    const name = DAYS[day].toString();
    dayItems.push(
      createStatItem(getters, sheetId, {
        id: getStatIdForDay(day),
        name,
        formula: `=COUNTIF(FILTER(WEEKDAY(${range}), ${range}), ${day + 1})`,
      })
    );
  }
  return {
    year: withPercentages(yearItems, col.nonEmpty.length),
    month: withPercentages(monthItems, col.nonEmpty.length),
    day: withPercentages(dayItems, col.nonEmpty.length),
  };
}

function withPercentages(items: StatValue[], total: number): StatValue[] {
  if (total === 0) {
    return items;
  }
  return items.map((item) => ({
    ...item,
    percentage: `(${Math.round((Number(item.value) / total) * 100)}%)`,
  }));
}

export function buildGroupedDateSections(
  getters: Getters,
  colDates: ColumnAnalysis,
  colValues: ColumnAnalysis,
  sheetId: string
): DateSections {
  if (!colDates || !colValues) {
    return {
      year: [],
      month: [],
      day: [],
    };
  }
  const zoneDates = colDates.headerInZone
    ? { ...colDates.zone, top: colDates.zone.top + 1 }
    : colDates.zone;
  const zoneValues = colValues.headerInZone
    ? { ...colValues.zone, top: colValues.zone.top + 1 }
    : colValues.zone;
  const valueCell = getters.getEvaluatedCellsInZone(sheetId, zoneValues);
  const valueFormat = valueCell.find((cell) => cell?.format)?.format;
<<<<<<< HEAD
=======
  // copy of code
>>>>>>> a1c3f1ba19 (first review with VSC)
  const rangeDates = zoneToXc(zoneDates);
  const rangeValues = zoneToXc(zoneValues);
  const dateValues = colDates.nonEmpty
    .map((cell) => cell.value)
    .filter((value): value is number => typeof value === "number");
  const earliestYear = numberToJsDate(Math.min(...dateValues)).getFullYear();
  const latestYear = numberToJsDate(Math.max(...dateValues)).getFullYear();
  const yearRange = Array.from(
    { length: latestYear - earliestYear + 1 },
    (_, i) => earliestYear + i
  );
<<<<<<< HEAD
=======
  // end of copy of code
>>>>>>> a1c3f1ba19 (first review with VSC)
  const yearItems = yearRange
    .map(
      (year) =>
        createStatItem(getters, sheetId, {
          id: String(year),
          name: getStatIdForYear(year),
<<<<<<< HEAD
=======
          // TODO: VSC is it the same as countif ?
>>>>>>> a1c3f1ba19 (first review with VSC)
          formula: `=SUMPRODUCT((YEAR(${rangeDates})=${year})*(${rangeValues}))`,
          format: valueFormat,
        })
      // `=SUM(--(YEAR(${range})=${year})*(${rangeValues}))`
    )
<<<<<<< HEAD
    .filter(isNonZero);
=======
    .filter(x=>x.rawValue !== 0);
>>>>>>> a1c3f1ba19 (first review with VSC)
  const monthItems = Object.entries(MONTHS)
    .map(([month, name]) =>
      createStatItem(getters, sheetId, {
        id: getStatIdForMonth(month),
        name: name.toString(),
        formula: `=SUMPRODUCT((MONTH(${rangeDates})=${
          Number(month) + 1
        })*(${rangeDates}<>"")*(${rangeValues}))`,
        format: valueFormat,
        //`=SUM((MONTH(${rangeDates})=${Number(month) + 1})*(${rangeDates}<>"")*(${rangeValues}))`
      })
    )
    .filter(isNonZero);
<<<<<<< HEAD
=======
    // TODO: day of the month (actual dates or weekdays or day of the month)
>>>>>>> a1c3f1ba19 (first review with VSC)
  const dayItems = Object.entries(DAYS)
    .map(([day, name]) =>
      createStatItem(getters, sheetId, {
        id: getStatIdForDay(day),
        name: name.toString(),
        formula: `=SUMPRODUCT((WEEKDAY(${rangeDates})=${
          Number(day) + 1
        })*(${rangeDates}<>"")*(${rangeValues}))`,
        format: valueFormat,
        //`=SUM((WEEKDAY(${rangeDates})=${Number(day) + 1})*(${rangeDates}<>"")*(${rangeValues}))`
      })
    )
    .filter(isNonZero);
  return {
    year: yearItems,
    month: monthItems,
    day: dayItems,
  };
}
