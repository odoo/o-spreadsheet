import { _t } from "../../translation";
import { CellValueType } from "../../types/cells";
import { Getters } from "../../types/getters";
import { ColumnAnalysis } from "../data_analysis";
import { numberToJsDate } from "../dates";
import { zoneToXc } from "../zones";
import {
  atDateGranularity,
  DateGranularity,
  interpretMedianDate,
  mostFrequentDateItem,
} from "./dates_statistics";
import { interpretAverage, interpretPearson, interpretPValue } from "./numbers_statistics";
import { item, literalForFormula, StatGroup, StatItem, StatSection } from "./statistics_items";

/**
 * Distinct values of a column, in first-seen order.
 * Categorical columns are capped at 20 uniques by construction.
 */
function uniqueValues(col: ColumnAnalysis): (string | number | boolean)[] {
  const seen = new Set<string>();
  const values: (string | number | boolean)[] = [];
  for (const cell of col.nonEmpty) {
    if (cell.type === CellValueType.error) {
      continue;
    }
    const key = String(cell.value);
    if (!seen.has(key)) {
      seen.add(key);
      values.push(cell.value as string | number | boolean);
    }
  }
  return values;
}

function columnTitle(col: ColumnAnalysis, indexInAll: number): string {
  if (col.header) {
    return col.header;
  }
  const n = indexInAll + 1;
  switch (col.type) {
    case "number":
    case "percentage":
      return _t("Col %s (numeric)", n);
    case "date":
      return _t("Col %s (date)", n);
    case "boolean":
      return _t("Col %s (boolean)", n);
    case "categorical":
      return _t("Col %s (category)", n);
    case "label":
      return _t("Col %s (label)", n);
    default:
      return _t("Col %s", n);
  }
}

/** Pattern A — Single number (or percentage) column: min, max, sum, average. */
function statsForNumberColumn(getters: Getters, sheetId: string, range: string): StatItem[] {
  return [
    item(getters, sheetId, _t("Min"), `=MIN(${range})`),
    item(getters, sheetId, _t("Max"), `=MAX(${range})`),
    item(getters, sheetId, _t("Sum"), `=SUM(${range})`),
    item(getters, sheetId, _t("Median"), `=MEDIAN(${range})`),
    item(
      getters,
      sheetId,
      _t("Average"),
      `=AVERAGE(${range})`,
      _t("Average of all non-empty values."),
      interpretAverage,
      [
        `=MEDIAN(${range})`,
        `=SKEW(${range})`,
        `=STDEV(${range})`,
        `=SUMPRODUCT(--(${range} > (QUARTILE.INC(${range}, 3) + 1.5 * (QUARTILE.INC(${range}, 3) - QUARTILE.INC(${range}, 1)))))`,
        `=SUMPRODUCT(--(${range} < (QUARTILE.INC(${range}, 1) - 1.5 * (QUARTILE.INC(${range}, 3) - QUARTILE.INC(${range}, 1)))))`,
      ]
    ),
  ];
}

/** Pattern B — Single date column: earliest, latest, median, span, business days, mode. */
function statsForDateColumn(
  getters: Getters,
  sheetId: string,
  col: ColumnAnalysis,
  range: string,
  granularity: DateGranularity = "date"
): StatItem[] {
  const serials = col.nonEmpty
    .filter((c) => typeof c.value === "number")
    .map((c) => c.value as number);

  const min = `MIN(${range})`;
  const max = `MAX(${range})`;
  const median = `MEDIAN(${range})`;

  const items: StatItem[] = [
    item(
      getters,
      sheetId,
      _t("Earliest"),
      atDateGranularity(min, granularity),
      _t("The oldest date in the dataset.")
    ),
    item(
      getters,
      sheetId,
      _t("Latest"),
      atDateGranularity(max, granularity),
      _t("The most recent date in the dataset.")
    ),
    item(
      getters,
      sheetId,
      _t("Median"),
      atDateGranularity(median, granularity),
      _t("The middle date: half of the dates are earlier, half are later."),
      interpretMedianDate,
      [`=${min}`, `=${max}`]
    ),
    item(
      getters,
      sheetId,
      _t("Span (days)"),
      `=DAYS(${max},${min})`,
      _t("Number of days between the earliest and latest date.")
    ),
    item(
      getters,
      sheetId,
      _t("Business days"),
      `=NETWORKDAYS(${min},${max})`,
      _t("Number of week days (excluding week-ends) between the earliest and latest date.")
    ),
  ];

  const modeItem = mostFrequentDateItem(getters, sheetId, range, serials, granularity);
  if (modeItem) {
    items.push(modeItem);
  }

  return items;
}

/** Pattern C — Single categorical column: count per category. */
function statsForCategoricalColumn(
  getters: Getters,
  sheetId: string,
  col: ColumnAnalysis,
  range: string
): StatGroup[] {
  const breakdown = uniqueValues(col).map((value) =>
    item(getters, sheetId, String(value), `=COUNTIF(${range},${literalForFormula(value)})`)
  );
  const count = item(getters, sheetId, _t("Number of non-empty rows"), `=COUNTA(${range})`);
  return [{ items: [count] }, { label: _t("Count by category"), items: breakdown }];
}

/** Pattern D — Single label column: unique count and empty count. */
function statsForLabelColumn(getters: Getters, sheetId: string, range: string): StatItem[] {
  return [
    item(
      getters,
      sheetId,
      _t("Unique"),
      `=COUNTUNIQUE(${range})`,
      _t("Number of distinct values.")
    ),
    item(
      getters,
      sheetId,
      _t("Empty"),
      `=COUNTBLANK(${range})`,
      _t("Number of cells with no value.")
    ),
  ];
}

/** Single boolean column: count, true, false, empty. Not covered by the new spec yet. */
function statsForBooleanColumn(getters: Getters, sheetId: string, range: string): StatItem[] {
  return [
    item(getters, sheetId, _t("True"), `=COUNTIF(${range},TRUE)`, _t("Number of TRUE values.")),
    item(getters, sheetId, _t("False"), `=COUNTIF(${range},FALSE)`, _t("Number of FALSE values.")),
    item(
      getters,
      sheetId,
      _t("Empty"),
      `=COUNTBLANK(${range})`,
      _t("Number of cells with no value.")
    ),
  ];
}

/** Pattern E — Category + Number: highest, lowest and sum per category. */
function statsForCategoryVsNumber(
  getters: Getters,
  sheetId: string,
  numRange: string,
  catCol: ColumnAnalysis,
  catRange: string,
  catTitle: string
): StatGroup[] {
  const highest: StatItem[] = [];
  const lowest: StatItem[] = [];
  const sum: StatItem[] = [];
  for (const value of uniqueValues(catCol)) {
    const criterion = `${catRange},${literalForFormula(value)}`;
    const name = String(value);
    highest.push(item(getters, sheetId, name, `=MAXIFS(${numRange},${criterion})`));
    lowest.push(item(getters, sheetId, name, `=MINIFS(${numRange},${criterion})`));
    sum.push(item(getters, sheetId, name, `=SUMIFS(${numRange},${criterion})`));
  }
  return [
    { label: _t("Highest by %s", catTitle), items: highest },
    { label: _t("Lowest by %s", catTitle), items: lowest },
    { label: _t("Sum by %s", catTitle), items: sum },
  ];
}

/** Pattern F — Label + Number: which label has the highest/lowest value. */
function statsForLabelVsNumber(
  getters: Getters,
  sheetId: string,
  numRange: string,
  labelRange: string,
  labelTitle: string
): StatGroup[] {
  return [
    {
      label: _t("By %s", labelTitle),
      items: [
        item(
          getters,
          sheetId,
          _t("Highest"),
          `=INDEX(${labelRange},MATCH(MAX(${numRange}),${numRange},0))`,
          _t("The entry with the highest value.")
        ),
        item(
          getters,
          sheetId,
          _t("Lowest"),
          `=INDEX(${labelRange},MATCH(MIN(${numRange}),${numRange},0))`,
          _t("The entry with the lowest value.")
        ),
      ],
    },
  ];
}

/**
 * Pattern G — Date + Number: highest, lowest and sum per year.
 * TODO ANHE: pick day/month/year granularity based on the date span instead of always year.
 */
function statsForDateVsNumber(
  getters: Getters,
  sheetId: string,
  numRange: string,
  dateCol: ColumnAnalysis,
  dateRange: string,
  dateTitle: string
): StatGroup[] {
  const years = Array.from(
    new Set(
      dateCol.nonEmpty
        .filter((c) => typeof c.value === "number")
        .map((c) => numberToJsDate(c.value as number).getFullYear())
    )
  ).sort((a, b) => a - b);

  const highest: StatItem[] = [];
  const lowest: StatItem[] = [];
  const sum: StatItem[] = [];
  for (const year of years) {
    const criterion = `${dateRange},">="&DATE(${year},1,1),${dateRange},"<"&DATE(${year + 1},1,1)`;
    const name = String(year);
    highest.push(item(getters, sheetId, name, `=MAXIFS(${numRange},${criterion})`));
    lowest.push(item(getters, sheetId, name, `=MINIFS(${numRange},${criterion})`));
    sum.push(item(getters, sheetId, name, `=SUMIFS(${numRange},${criterion})`));
  }
  return [
    { label: _t("Highest by year (%s)", dateTitle), items: highest },
    { label: _t("Lowest by year (%s)", dateTitle), items: lowest },
    { label: _t("Sum by year (%s)", dateTitle), items: sum },
  ];
}

/** Pattern H — Number + Number: correlation and independence. */
function statsForNumberVsNumber(
  getters: Getters,
  sheetId: string,
  range: string,
  otherRange: string,
  otherTitle: string
): StatGroup[] {
  return [
    {
      label: otherTitle,
      items: [
        item(
          getters,
          sheetId,
          _t("Correlation"),
          `=PEARSON(${range},${otherRange})`,
          _t(
            "Linear correlation from -1 to 1. |r| > 0.7 = strong, 0.3–0.7 = moderate, < 0.3 = weak."
          ),
          interpretPearson
        ),
        item(
          getters,
          sheetId,
          _t("Independence"),
          `=T.TEST(${range},${otherRange},2,3)`,
          _t(
            "Probability of observing this difference by chance alone. < 0.05 = the two columns are likely related."
          ),
          interpretPValue
        ),
      ],
    },
  ];
}

/** Pattern I — Category + Category: independence (Cramér's V and χ² test). */
function statsForCategoryVsCategory(
  getters: Getters,
  sheetId: string,
  range: string,
  otherRange: string,
  otherTitle: string
): StatGroup[] {
  return [
    {
      label: otherTitle,
      items: [
        item(
          getters,
          sheetId,
          _t("Cramér's V"),
          `=SQRT(CHISQ.TEST(${range},${otherRange}) / (COUNTA(${range}) * (MIN(COUNTUNIQUE(${range}), COUNTUNIQUE(${otherRange})) - 1)))`,
          _t(
            "Strength of association between two categorical columns, from 0 (none) to 1 (perfect)."
          ),
          (v) => {
            if (v < 0.1) {
              return { main: _t("Negligible association") };
            }
            if (v < 0.3) {
              return { main: _t("Weak association") };
            }
            if (v < 0.5) {
              return { main: _t("Moderate association") };
            }
            return { main: _t("Strong association") };
          }
        ),
        item(
          getters,
          sheetId,
          _t("Independence"),
          `=CHISQ.DIST.RT(CHISQ.TEST(${range},${otherRange}),(COUNTUNIQUE(${range})-1)*(COUNTUNIQUE(${otherRange})-1))`,
          _t("Probability that the two columns are independent by chance."),
          interpretPValue
        ),
      ],
    },
  ];
}

/** Boolean + Boolean: kept as-is (MCC), not part of the new spec yet. */
function statsForBooleanVsBoolean(
  getters: Getters,
  sheetId: string,
  range: string,
  otherRange: string,
  otherTitle: string
): StatGroup[] {
  return [
    {
      label: otherTitle,
      items: [
        item(
          getters,
          sheetId,
          _t("MCC"),
          `=MATTHEWS(${range},${otherRange})`,
          _t(
            "Matthews Correlation Coefficient: correlation between two yes/no columns, from -1 to 1."
          ),
          (v) => {
            const abs = Math.abs(v);
            if (abs < 0.2) {
              return { main: _t("Very weak or no correlation") };
            }
            const dir = v > 0 ? _t("positive") : _t("negative");
            if (abs < 0.4) {
              return { main: _t("Weak %s correlation", dir) };
            }
            if (abs < 0.6) {
              return { main: _t("Moderate %s correlation", dir) };
            }
            if (abs < 0.8) {
              return { main: _t("Strong %s correlation", dir) };
            }
            return { main: _t("Very strong %s correlation", dir) };
          }
        ),
      ],
    },
  ];
}

/** Patterns A–D — a single column's own stats, dispatched on its type. */
export function baseStatGroups(
  getters: Getters,
  sheetId: string,
  col: ColumnAnalysis,
  range: string,
  dateGranularity: DateGranularity = "date"
): StatGroup[] {
  const commonStats = item(getters, sheetId, _t("Number of non-empty rows"), `=COUNTA(${range})`);
  switch (col.type) {
    case "number":
    case "percentage":
      return [
        {
          items: [commonStats, ...statsForNumberColumn(getters, sheetId, range)],
        },
      ];
    case "date":
      return [
        {
          items: [
            commonStats,
            ...statsForDateColumn(getters, sheetId, col, range, dateGranularity),
          ],
        },
      ];
    case "categorical":
      return statsForCategoricalColumn(getters, sheetId, col, range);
    case "label":
      return [
        {
          items: [commonStats, ...statsForLabelColumn(getters, sheetId, range)],
        },
      ];
    case "boolean":
      return [
        {
          items: [commonStats, ...statsForBooleanColumn(getters, sheetId, range)],
        },
      ];
    default:
      return [];
  }
}

/** Single column selected: just its own stats, no cross-column pattern applies. */
function sectionsForSingleColumn(
  getters: Getters,
  sheetId: string,
  col: ColumnAnalysis,
  title: (col: ColumnAnalysis) => string
): StatSection[] {
  const range = zoneToXc(col.zone);
  return [{ title: title(col), range, groups: baseStatGroups(getters, sheetId, col, range) }];
}

const isNumberLike = (col: ColumnAnalysis) => col.type === "number" || col.type === "percentage";

/**
 * Two columns selected: own stats for each, plus the cross-stat pattern matching their types
 * (E — Category vs Number, F — Label vs Number, G — Date vs Number, H — Number vs Number,
 * I — Category vs Category, Boolean vs Boolean). Unmatched type pairs get no cross-stat.
 */
function sectionsForColumnPair(
  getters: Getters,
  sheetId: string,
  colA: ColumnAnalysis,
  colB: ColumnAnalysis,
  title: (col: ColumnAnalysis) => string
): StatSection[] {
  const rangeA = zoneToXc(colA.zone);
  const rangeB = zoneToXc(colB.zone);
  const groupsA = baseStatGroups(getters, sheetId, colA, rangeA);
  const groupsB = baseStatGroups(getters, sheetId, colB, rangeB);

  if (isNumberLike(colA) && isNumberLike(colB)) {
    groupsA.push(...statsForNumberVsNumber(getters, sheetId, rangeA, rangeB, title(colB)));
    groupsB.push(...statsForNumberVsNumber(getters, sheetId, rangeB, rangeA, title(colA)));
  } else if (colA.type === "categorical" && isNumberLike(colB)) {
    groupsB.push(...statsForCategoryVsNumber(getters, sheetId, rangeB, colA, rangeA, title(colA)));
  } else if (isNumberLike(colA) && colB.type === "categorical") {
    groupsA.push(...statsForCategoryVsNumber(getters, sheetId, rangeA, colB, rangeB, title(colB)));
  } else if (colA.type === "date" && isNumberLike(colB)) {
    groupsB.push(...statsForDateVsNumber(getters, sheetId, rangeB, colA, rangeA, title(colA)));
  } else if (isNumberLike(colA) && colB.type === "date") {
    groupsA.push(...statsForDateVsNumber(getters, sheetId, rangeA, colB, rangeB, title(colB)));
  } else if (colA.type === "label" && isNumberLike(colB)) {
    groupsB.push(...statsForLabelVsNumber(getters, sheetId, rangeB, rangeA, title(colA)));
  } else if (isNumberLike(colA) && colB.type === "label") {
    groupsA.push(...statsForLabelVsNumber(getters, sheetId, rangeA, rangeB, title(colB)));
  } else if (colA.type === "categorical" && colB.type === "categorical") {
    groupsA.push(...statsForCategoryVsCategory(getters, sheetId, rangeA, rangeB, title(colB)));
    groupsB.push(...statsForCategoryVsCategory(getters, sheetId, rangeB, rangeA, title(colA)));
  } else if (colA.type === "boolean" && colB.type === "boolean") {
    groupsA.push(...statsForBooleanVsBoolean(getters, sheetId, rangeA, rangeB, title(colB)));
    groupsB.push(...statsForBooleanVsBoolean(getters, sheetId, rangeB, rangeA, title(colA)));
  }

  return [
    { title: title(colA), range: rangeA, groups: groupsA },
    { title: title(colB), range: rangeB, groups: groupsB },
  ];
}

function sectionsForManyColumns(
  getters: Getters,
  sheetId: string,
  cols: ColumnAnalysis[],
  title: (col: ColumnAnalysis) => string
): StatSection[] {
  return [];
}

export function buildStatSections(
  getters: Getters,
  cols: ColumnAnalysis[],
  sheetId: string
): StatSection[] {
  const nonEmpty = cols.filter((c) => c.type !== "empty");
  if (!nonEmpty.length) {
    return [];
  }

  const colIndex = new Map<ColumnAnalysis, number>();
  nonEmpty.forEach((col, i) => colIndex.set(col, i));
  const title = (col: ColumnAnalysis) => columnTitle(col, colIndex.get(col)!);

  const numberOfColumns = nonEmpty.length;

  if (numberOfColumns === 1) {
    return sectionsForSingleColumn(getters, sheetId, nonEmpty[0], title);
  }

  if (numberOfColumns === 2) {
    return sectionsForColumnPair(getters, sheetId, nonEmpty[0], nonEmpty[1], title);
  }

  return sectionsForManyColumns(getters, sheetId, nonEmpty, title);
}
