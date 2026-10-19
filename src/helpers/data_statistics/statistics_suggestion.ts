import { _t } from "../../translation";
import { CellValue, CellValueType, EvaluatedCell } from "../../types/cells";
import { Getters } from "../../types/getters";
import { numberToJsDate } from "../dates";
import { formatValue, MONTHS, QUARTERS, DAYS as WEEKDAYS } from "../format/format";
import { toTrimmedLowerCase } from "../text_helper";
import { zoneToXc } from "../zones";
import { ColumnAnalysis } from "./data_analysis";
import {
  createStatItem,
  DateSections,
  getStatIdForDay,
  getStatIdForMonth,
  getStatIdForQuarter,
  getStatIdForWeek,
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
// ADD _t()
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
      : { id: item.id, name, formula: "", rawValue: 0, value: "—" };
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
    .map(({ type, value, formattedValue }) => {
      const id = generateItemIdFromValue(value);
      let formula: string;
      if (id === "true" || id === "false") {
        formula = `=COUNTIF(${range},${formattedValue})+SUMPRODUCT(ISTEXT(${range})*(${range}="${formattedValue}"))`;
      } else if (typeof value === "string") {
        formula = `=COUNTIF(${range},${`"${value}"`})`;
      } else {
        formula = `=COUNTIF(${range},${value})`;
      }
      return {
        ...createStatItem(getters, sheetId, {
          id,
          name: formattedValue,
          formula,
          chartTitle: _t('Occurrences of "%s"', formattedValue),
          computedValue: {
            value: count.get(id) ?? 0,
          },
        }),
        rawData: { type, value },
      };
    });
  return withPercentages(items, col.nonEmpty.length);
}

export function buildSumByCategoryItems(
  getters: Getters,
  categoryColumn: ColumnAnalysis,
  valueColumn: ColumnAnalysis,
  sheetId: string
): StatValue[] {
  if (!categoryColumn || !valueColumn) {
    return [];
  }
  const hasHeader = categoryColumn.headerInZone || valueColumn.headerInZone;
  const categoryZone = hasHeader
    ? { ...categoryColumn.zone, top: categoryColumn.zone.top + 1 }
    : categoryColumn.zone;
  const valueZone = hasHeader
    ? { ...valueColumn.zone, top: valueColumn.zone.top + 1 }
    : valueColumn.zone;

  if (categoryZone.bottom - categoryZone.top !== valueZone.bottom - valueZone.top) {
    return [];
  }

  const categoryRange = zoneToXc(categoryZone);
  const valueRange = zoneToXc(valueZone);
  const categoryCells = getters.getEvaluatedCellsInZone(sheetId, categoryZone);
  const valueCells = getters.getEvaluatedCellsInZone(sheetId, valueZone);
  const format = valueCells.find((cell) => cell.format)?.format;
  const locale = getters.getLocale();

  const sumByCategory: Record<string, number> = {};
  for (let i = 0; i < categoryCells.length; i++) {
    const cellValue = categoryCells[i].value;
    let category = cellValue?.toString().trim();
    if (typeof cellValue === "boolean") {
      category = category?.toUpperCase();
    }
    const value = Number(valueCells[i].value);
    if (category && !isNaN(value) && value !== 0) {
      sumByCategory[category] = (sumByCategory[category] || 0) + value;
    }
  }

  return Object.entries(sumByCategory).map(([category, total]) => ({
    ...createStatItem(getters, sheetId, {
      id: generateItemIdFromValue(category),
      name: category,
      formula: `=SUMIF(${categoryRange},"${category}",${valueRange})`,
      chartTitle: _t('Sum of "%s"', category),
      computedValue: { value: total },
    }),
    value: format ? formatValue(total, { format, locale }) : String(total),
    rawValue: total,
    rawData: {
      type: "text" as CellValueType,
      value: category,
    },
  }));
}

function uniqueValues(
  cells: EvaluatedCell[]
): { type: CellValueType; value: CellValue; formattedValue: string }[] {
  const normalizedValues = new Set<string>();
  const uniqueValuesList: { type: CellValueType; value: CellValue; formattedValue: string }[] = [];
  for (const cell of cells) {
    const normalizedValue = toTrimmedLowerCase(String(cell.value));
    if (!normalizedValues.has(normalizedValue)) {
      uniqueValuesList.push(cell);
      normalizedValues.add(normalizedValue);
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
  let trueCount = 0;
  let falseCount = 0;
  for (const cell of col.nonEmpty) {
    if (cell.value === true) {
      trueCount++;
    } else if (cell.value === false) {
      falseCount++;
    }
  }
  const items = [
    createStatItem(getters, sheetId, {
      id: "true",
      name: _t("TRUE"),
      formula: `=COUNTIF(${range},TRUE)`,
      chartTitle: _t('Occurrences of "%s"', _t("TRUE")),
      computedValue: { value: trueCount },
    }),
    createStatItem(getters, sheetId, {
      id: "false",
      name: _t("FALSE"),
      formula: `=COUNTIF(${range},FALSE)`,
      chartTitle: _t('Occurrences of "%s"', _t("FALSE")),
      computedValue: { value: falseCount },
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
  const yearCount: Map<number, number> = new Map();
  const monthCount: number[] = new Array(12).fill(0);
  const dayCount: number[] = new Array(7).fill(0);
  for (const value of dateValues) {
    const date = numberToJsDate(value);
    const year = date.getFullYear();
    yearCount.set(year, (yearCount.get(year) ?? 0) + 1);
    monthCount[date.getMonth()]++;
    dayCount[date.getDay()]++;
  }
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
      computedValue: { value: yearCount.get(year) ?? 0 },
    })
  );
  const monthItems = Object.entries(MONTHS).map(([month, name]) =>
    createStatItem(getters, sheetId, {
      id: getStatIdForMonth(month),
      name: name.toString(),
      formula: `=COUNTIF(FILTER(MONTH(${range}), ${range}), ${Number(month) + 1})`,
      computedValue: { value: monthCount[Number(month)] },
    })
  );
  const locale = getters.getLocale();
  const firstDayOfWeek = locale.weekStart;
  const offset = firstDayOfWeek % 7;
  const dayItems: StatValue[] = [];
  for (let i = 0; i < 7; i++) {
    const day = (i + offset) % 7;
    const name = WEEKDAYS[day].toString();
    dayItems.push(
      createStatItem(getters, sheetId, {
        id: getStatIdForDay(day),
        name,
        formula: `=COUNTIF(FILTER(WEEKDAY(${range}), ${range}), ${day + 1})`,
        computedValue: { value: dayCount[day] },
      })
    );
  }
  return {
    year: withPercentages(yearItems, col.nonEmpty.length),
    quarter: [],
    month: withPercentages(monthItems, col.nonEmpty.length),
    week: [],
    weekday: [],
    day: withPercentages(dayItems, col.nonEmpty.length),
    date: [],
  };
}

function withPercentages(items: StatValue[], count: number): StatValue[] {
  if (count === 0) {
    return items;
  }
  return items.map((item) => ({
    ...item,
    percentage: `(${Math.round((Number(item.value) / count) * 100)}%)`,
  }));
}

export function buildGroupedDateSections(
  getters: Getters,
  dateColumn: ColumnAnalysis,
  valueColumn: ColumnAnalysis,
  sheetId: string
): DateSections {
  const emptyDefaultDateSections = {
    year: [],
    quarter: [],
    month: [],
    week: [],
    weekday: [],
    day: [],
    date: [],
  };
  if (!dateColumn || !valueColumn) {
    return emptyDefaultDateSections;
  }

  const dateZone = dateColumn.headerInZone
    ? { ...dateColumn.zone, top: dateColumn.zone.top + 1 }
    : dateColumn.zone;
  const valueZone = valueColumn.headerInZone
    ? { ...valueColumn.zone, top: valueColumn.zone.top + 1 }
    : valueColumn.zone;

  if (dateZone.bottom - dateZone.top !== valueZone.bottom - valueZone.top) {
    return emptyDefaultDateSections;
  }

  const dateValues = dateColumn.nonEmpty
    .map((c) => c.value)
    .filter((v): v is number => typeof v === "number");
  if (dateValues.length === 0) {
    return emptyDefaultDateSections;
  }

  const minDate = numberToJsDate(Math.min(...dateValues));
  const maxDate = numberToJsDate(Math.max(...dateValues));
  const format = getters.getEvaluatedCellsInZone(sheetId, valueZone).find((c) => c?.format)?.format;
  const datesRange = zoneToXc(dateZone);
  const valuesRange = zoneToXc(valueZone);

  const range = (min: number, max: number) =>
    Array.from({ length: max - min + 1 }, (_, i) => min + i);

  function buildStatItems<T>(
    items: T[],
    getParameters: (item: T) => { id: string; name: string; condition: string }
  ) {
    return items
      .map((item) => {
        const { id, name, condition } = getParameters(item);
        return createStatItem(getters, sheetId, {
          id,
          name,
          formula: `=SUMIF(${condition}, ${valuesRange})`,
          format,
        });
      })
      .filter((statItem) => statItem.rawValue !== 0);
  }

  return {
    year: buildStatItems(range(minDate.getFullYear(), maxDate.getFullYear()), (year) => ({
      id: String(year),
      name: getStatIdForYear(year),
      condition: `YEAR(${datesRange}), ${year}`,
    })),
    quarter: buildStatItems(Object.entries(QUARTERS), ([quarter, name]) => ({
      id: getStatIdForQuarter(quarter),
      name: String(name),
      condition: `QUARTER(${datesRange}), ${Number(quarter)}`,
    })),
    month: buildStatItems(Object.entries(MONTHS), ([month, name]) => ({
      id: getStatIdForMonth(month),
      name: String(name),
      condition: `MONTH(${datesRange}), ${Number(month) + 1}`,
    })),
    week: buildStatItems(range(minDate.getIsoWeek(), maxDate.getIsoWeek()), (week) => ({
      id: String(week),
      name: getStatIdForWeek(week),
      condition: `ISOWEEKNUM(${datesRange}), ${week}`,
    })),
    weekday: buildStatItems(Object.entries(WEEKDAYS), ([date, name]) => ({
      id: getStatIdForDay(date),
      name: String(name),
      condition: `WEEKDAY(${datesRange}), ${Number(date) + 1}`,
    })),
    day: buildStatItems(range(1, 31), (date) => ({
      id: getStatIdForDay(date),
      name: String(date),
      condition: `DAY(${datesRange}), ${date}`,
    })),
    date: buildStatItems(Array.from(new Set(dateValues)), (date) => ({
      id: String(date),
      name: formatValue(date, { locale: getters.getLocale(), format: "m/d/yyyy" }),
      condition: `${datesRange}, ${date}`,
    })),
  };
}
