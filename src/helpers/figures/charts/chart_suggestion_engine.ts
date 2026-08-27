import { _t } from "../../../translation";
import { ChartDefinition } from "../../../types/chart/chart";
import {
  CategoricalDateNumberContext,
  CategoricalTwoNumbersContext,
  CategoricalVsMultipleNumbersContext,
  CategoricalVsNumberContext,
  CategoricalVsPercentageContext,
  DateVsMultipleNumbersContext,
  DateVsSeriesContext,
  LabelVsMultipleNumbersContext,
  LabelVsNumberContext,
  ManyNumbersContext,
  MultipleCategoricalsVsNumberContext,
  NumberVsNumberContext,
  SingleCategoricalContext,
  SingleDateContext,
  SingleLabelContext,
  SingleNumberContext,
  SinglePercentageContext,
  Suggestion,
} from "../../../types/chart/chart_suggestion";
import { Getters } from "../../../types/getters";
import { Zone } from "../../../types/misc";
import { toXC } from "../../coordinates";
import { analyzeColumns, ColumnAnalysis, ExtendedColumnType } from "../../data_analysis";
import {
  dataset,
  getUnboundRange,
  isDatasetTitled,
  rangeSource,
} from "./chart_data_source_helpers";
import {
  CATEGORICAL_DATE_NUMBER_SUGGESTIONS,
  CATEGORICAL_TWO_NUMBERS_SUGGESTIONS,
  CATEGORICAL_VS_MULTIPLE_NUMBERS_SUGGESTIONS,
  CATEGORICAL_VS_NUMBER_SUGGESTIONS,
  CATEGORICAL_VS_PERCENTAGE_SUGGESTIONS,
  DATE_VS_MULTIPLE_NUMBERS_SUGGESTIONS,
  DATE_VS_SERIES_SUGGESTIONS,
  LABEL_VS_MULTIPLE_NUMBERS_SUGGESTIONS,
  LABEL_VS_NUMBER_SUGGESTIONS,
  MANY_NUMBERS_SUGGESTIONS,
  MULTIPLE_CATEGORICALS_VS_NUMBER_SUGGESTIONS,
  NUMBER_VS_NUMBER_SUGGESTIONS,
  SINGLE_CATEGORICAL_COLUMN_SUGGESTIONS,
  SINGLE_DATE_COLUMN_SUGGESTIONS,
  SINGLE_LABEL_COLUMN_SUGGESTIONS,
  SINGLE_NUMBER_COLUMN_SUGGESTIONS,
  SINGLE_PERCENTAGE_COLUMN_SUGGESTIONS,
} from "./charts_suggestions_constants";

const PYRAMID_HEADER_KEYWORDS = [
  "male",
  "female",
  "man",
  "woman",
  "boy",
  "girl",
  "before",
  "after",
  "previous",
  "current",
  "positive",
  "negative",
  "gain",
  "loss",
  "income",
  "expense",
  "revenue",
  "cost",
];

const PYRAMID_HEADER_KEYWORD_PATTERNS = PYRAMID_HEADER_KEYWORDS.map(
  (keyword) => new RegExp(`\\b${keyword}\\b`, "i")
);

export interface ChartSuggestion {
  description: string;
  definition: ChartDefinition;
}

// -----------------------------------------------------------------------------
// Rule framework
//
// A column "shape" (the tuple of each selected column's ExtendedColumnType) is matched
// against a table of rules to decide which chart suggestions to propose.
// Rules are divided in two categories:
//  * EXACT_PATTERNS: a fixed-length array of column types (e.g. "number + number" or "categorical + date + percentage").
//  * EXTENDABLE_PATTERNS: a fixed-length set of leading types followed by one or more columns of a fixed type (e.g. "many-numbers" or "label + multiple numbers").
// -----------------------------------------------------------------------------

type ColumnTypeSpec = ExtendedColumnType | readonly ExtendedColumnType[];

/** A RulePattern describes the column types that a rule applies to. It contains a fixed-length
 *  array of leading types, and optionally an extension type that can repeat one or more times.
 * The leadingTypes is required anytime, while the extension is only present for extendable patterns.
 */
interface RulePattern {
  readonly leadingTypes: readonly ColumnTypeSpec[];
  //Present only for extendable patterns: every column after leadingTypes must match `type`,
  readonly extension?: { readonly type: ColumnTypeSpec; readonly minSize: number };
}

function matchesColumnType(spec: ColumnTypeSpec, type: ExtendedColumnType): boolean {
  return Array.isArray(spec) ? spec.includes(type) : spec === type;
}

function matchesShape(pattern: RulePattern, shape: ExtendedColumnType[]): boolean {
  const { leadingTypes, extension } = pattern;
  const expectedLength = leadingTypes.length + (extension?.minSize ?? 0);
  if (extension ? shape.length < expectedLength : shape.length !== expectedLength) {
    return false;
  }
  return shape.every((type, i) => {
    const spec = i < leadingTypes.length ? leadingTypes[i] : extension?.type;
    return spec !== undefined && matchesColumnType(spec, type);
  });
}

interface ChartSuggestionRule<T> {
  pattern: RulePattern;
  buildContext: (cols: ColumnAnalysis[], getters: Getters) => T;
  suggestions: Suggestion<T>[];
}

function isPyramidLike(numCol1: ColumnAnalysis, numCol2: ColumnAnalysis): boolean {
  const h1 = numCol1.title ?? "";
  const h2 = numCol2.title ?? "";
  return PYRAMID_HEADER_KEYWORD_PATTERNS.some((re) => re.test(h1) || re.test(h2));
}

/** Returns the first and last cell XC coordinates, and the second-to-last cell XC coordinate if it exists. */
function interestingCellsXc(col: ColumnAnalysis): {
  firstCellXC: string;
  lastCellXC: string;
  prevCellXC?: string;
} {
  if (!col) {
    return { firstCellXC: "", lastCellXC: "", prevCellXC: undefined };
  }
  const firstCellPosition = col.nonEmpty.at(0)?.position;
  const firstCellXC = firstCellPosition ? toXC(firstCellPosition?.col, firstCellPosition?.row) : "";
  const lastCellPosition = col.nonEmpty.at(-1)?.position;
  const lastCellXC = lastCellPosition ? toXC(lastCellPosition?.col, lastCellPosition?.row) : "";
  const prevCellPosition = col.nonEmpty.at(-2)?.position;
  const prevCellXC = prevCellPosition
    ? toXC(prevCellPosition?.col, prevCellPosition?.row)
    : undefined;
  return { firstCellXC, lastCellXC, prevCellXC };
}

function getCategoryHeader(
  getters: Getters,
  catCol: ColumnAnalysis,
  headerInZone: boolean
): string {
  if (catCol.title) {
    return catCol.title;
  }
  if (headerInZone && catCol.rowCount > 0) {
    const { left, top } = catCol.zone;
    const cellValue = getters.getEvaluatedCell({
      sheetId: getters.getActiveSheetId(),
      col: left,
      row: top,
    })?.value;
    if (cellValue) {
      return cellValue.toString();
    }
  }
  return _t("Category");
}

/** Pattern A — Single numeric column */
function buildSingleNumberContext([col]: ColumnAnalysis[], getters: Getters): SingleNumberContext {
  const title = col.title ?? "";
  const { firstCellXC, lastCellXC, prevCellXC } = interestingCellsXc(col);
  const source = rangeSource([dataset(col.zone, getters)], col.headerInZone);
  return { title, source, rowCount: col.rowCount, firstCellXC, lastCellXC, prevCellXC };
}

/** Pattern B — Single percentage column */
function buildSinglePercentageContext(
  [col]: ColumnAnalysis[],
  getters: Getters
): SinglePercentageContext {
  const title = col.title ?? "";
  const { firstCellXC, lastCellXC, prevCellXC } = interestingCellsXc(col);
  const source = rangeSource([dataset(col.zone, getters)], col.headerInZone);
  const isAboveOne = (col.maxValue ?? 0) > 1;
  return { title, source, rowCount: col.rowCount, firstCellXC, lastCellXC, prevCellXC, isAboveOne };
}

/** Pattern C — Single date column */
function buildSingleDateContext([col]: ColumnAnalysis[]): SingleDateContext {
  const { lastCellXC } = interestingCellsXc(col);
  return { title: col.title ?? "", lastCellXC, rowCount: col.rowCount };
}

/** Pattern D — Single categorical column */
function buildSingleCategoricalContext(
  [col]: ColumnAnalysis[],
  getters: Getters
): SingleCategoricalContext {
  const title = col.title ?? "";
  const range = getUnboundRange(getters, col.zone);
  const source = rangeSource([dataset(col.zone, getters)], col.headerInZone, range);
  return { title, source, range };
}

/** Pattern E — Single label column */
function buildSingleLabelContext([col]: ColumnAnalysis[]): SingleLabelContext {
  const { lastCellXC } = interestingCellsXc(col);
  return { title: col.title ?? "", lastCellXC, rowCount: col.rowCount };
}

/** Pattern F — Categorical + Number */
function buildCategoricalVsNumberContext(
  [catCol, numCol]: ColumnAnalysis[],
  getters: Getters
): CategoricalVsNumberContext {
  const labelRange = getUnboundRange(getters, catCol.zone);
  const headerInZone = numCol.headerInZone;
  const categoryHeader = getCategoryHeader(getters, catCol, headerInZone);
  const title = numCol.title
    ? _t("%(numberHeader)s by %(categoryHeader)s", {
        numberHeader: numCol.title,
        categoryHeader,
      })
    : "";
  const source = rangeSource([dataset(numCol.zone, getters)], headerInZone, labelRange);
  const treemapSource = rangeSource(
    [dataset(catCol.zone, getters)],
    headerInZone,
    getUnboundRange(getters, numCol.zone)
  );
  return { title, source, treemapSource };
}

/** Patterns G & J — Date + Number or Date + Percentage */
function buildDateVsSeriesContext(
  [dateCol, seriesCol]: ColumnAnalysis[],
  getters: Getters
): DateVsSeriesContext {
  const isPercentage = seriesCol.type === "percentage";
  const labelRange = getUnboundRange(getters, dateCol.zone);
  const headerInZone = isDatasetTitled(getters, dateCol.zone);
  const title = seriesCol.title
    ? _t("%(seriesHeader)s over time", { seriesHeader: seriesCol.title })
    : "";
  const source = rangeSource([dataset(seriesCol.zone, getters)], headerInZone, labelRange);
  return { title, source, isPercentage };
}

/** Pattern H — Number + Number */
function buildNumberVsNumberContext(
  [col1, col2]: ColumnAnalysis[],
  getters: Getters
): NumberVsNumberContext {
  const title =
    col1.title && col2.title
      ? _t("%(col2Header)s vs %(col1Header)s", { col2Header: col2.title, col1Header: col1.title })
      : "";
  const headerInZone = col1.headerInZone || col2.headerInZone;
  const source2 = rangeSource(
    [dataset(col2.zone, getters)],
    col2.headerInZone,
    getUnboundRange(getters, col1.zone)
  );
  const sourceBoth = rangeSource(
    [dataset(col1.zone, getters, "0"), dataset(col2.zone, getters, "1")],
    headerInZone
  );
  const { lastCellXC } = interestingCellsXc(col2);
  const { lastCellXC: prevCellXC } = interestingCellsXc(col1);
  return {
    title,
    source2,
    sourceBoth,
    rowCount1: col1.rowCount,
    rowCount2: col2.rowCount,
    lastCellXC,
    prevCellXC,
  };
}

/** Pattern I — Categorical + Percentage */
function buildCategoricalVsPercentageContext(
  [catCol, pctCol]: ColumnAnalysis[],
  getters: Getters
): CategoricalVsPercentageContext {
  const labelRange = getUnboundRange(getters, catCol.zone);
  const headerInZone = pctCol.headerInZone;
  const categoryHeader = getCategoryHeader(getters, catCol, headerInZone);
  const title = pctCol.title
    ? _t("%(percentageHeader)s by %(categoryHeader)s", {
        percentageHeader: pctCol.title,
        categoryHeader,
      })
    : "";
  const source = rangeSource([dataset(pctCol.zone, getters)], headerInZone, labelRange);
  return { title, source, rowCount: catCol.rowCount };
}

/** Pattern K — Label + Number */
function buildLabelVsNumberContext(
  [labelCol, numCol]: ColumnAnalysis[],
  getters: Getters
): LabelVsNumberContext {
  const labelRange = getUnboundRange(getters, labelCol.zone);
  const title = numCol.title
    ? _t("%(numberHeader)s by %(labelHeader)s", {
        numberHeader: numCol.title,
        labelHeader: labelCol.title ?? _t("Name"),
      })
    : "";
  const source = rangeSource([dataset(numCol.zone, getters)], numCol.headerInZone, labelRange);
  const { lastCellXC } = interestingCellsXc(numCol);
  const { lastCellXC: prevCellXC } = interestingCellsXc(labelCol);
  return { title, source, rowCount: labelCol.rowCount, lastCellXC, prevCellXC };
}

/** Pattern M — Categorical + Multiple Numbers */
function buildCategoricalVsMultipleNumbersContext(
  [catCol, ...numCols]: ColumnAnalysis[],
  getters: Getters
): CategoricalVsMultipleNumbersContext {
  const labelRange = getUnboundRange(getters, catCol.zone);
  const headerInZone = numCols.some((c) => c.headerInZone);
  const categoryHeader = getCategoryHeader(getters, catCol, headerInZone);
  const title = headerInZone ? _t("Multi-series By %(categoryHeader)s", { categoryHeader }) : "";
  const dataSets = numCols.map((c, i) => dataset(c.zone, getters, String(i)));
  const source = rangeSource(dataSets, headerInZone, labelRange);
  return { title, source, rowCount: catCol.rowCount };
}

/** Pattern N — Date + Multiple Numbers */
function buildDateVsMultipleNumbersContext(
  [dateCol, ...numCols]: ColumnAnalysis[],
  getters: Getters
): DateVsMultipleNumbersContext {
  const labelRange = getUnboundRange(getters, dateCol.zone);
  const headerInZone =
    numCols.some((c) => c.headerInZone) || isDatasetTitled(getters, dateCol.zone);
  const title =
    numCols.length === 1 && numCols[0].title
      ? _t("%(header)s over time", { header: numCols[0].title })
      : "";
  const dataSets = numCols.map((c, i) => dataset(c.zone, getters, String(i)));
  const source = rangeSource(dataSets, headerInZone, labelRange);
  return { title, source };
}

/** Pattern O — Categorical + Categorical + Number */
function buildMultipleCategoricalsVsNumberContext(
  [cat1, cat2, numCol]: ColumnAnalysis[],
  getters: Getters
): MultipleCategoricalsVsNumberContext {
  const title = numCol.title
    ? _t("%(numHeader)s by %(cat1Header)s and %(cat2Header)s", {
        numHeader: numCol.title,
        cat1Header: cat1.title ?? _t("Level 1"),
        cat2Header: cat2.title ?? _t("Level 2"),
      })
    : "";
  const headerInZone = numCol.headerInZone;
  const hierarchySource = rangeSource(
    [dataset(cat1.zone, getters, "0"), dataset(cat2.zone, getters, "1")],
    headerInZone,
    getUnboundRange(getters, numCol.zone)
  );
  const barSource = rangeSource(
    [dataset(numCol.zone, getters)],
    headerInZone,
    getUnboundRange(getters, cat1.zone)
  );
  return { title, hierarchySource, barSource };
}

/** Pattern P — Categorical + Date + Number */
function buildCategoricalDateNumberContext(
  [catCol, dateCol, numCol]: ColumnAnalysis[],
  getters: Getters
): CategoricalDateNumberContext {
  const dateRange = getUnboundRange(getters, dateCol.zone);
  const catRange = getUnboundRange(getters, catCol.zone);
  const headerInZone = numCol.headerInZone;
  const catHeader = getCategoryHeader(getters, catCol, headerInZone);
  const title = numCol.title
    ? _t("%(numHeader)s by %(catHeader)s over %(dateHeader)s", {
        numHeader: numCol.title,
        catHeader,
        dateHeader: dateCol.title ?? _t("Time"),
      })
    : "";
  const sourceByDate = rangeSource([dataset(numCol.zone, getters)], headerInZone, dateRange);
  const sourceByCat = rangeSource([dataset(numCol.zone, getters)], headerInZone, catRange);
  return { title, sourceByDate, sourceByCat };
}

/** Pattern Q — Label + Multiple Numbers */
function buildLabelVsMultipleNumbersContext(
  [labelCol, ...numCols]: ColumnAnalysis[],
  getters: Getters
): LabelVsMultipleNumbersContext {
  const labelRange = getUnboundRange(getters, labelCol.zone);
  const headerInZone = numCols.some((c) => c.headerInZone);
  const title = labelCol.title ? _t("By %(title)s", { title: labelCol.title }) : "";
  const dataSets = numCols.map((c, i) => dataset(c.zone, getters, String(i)));
  const source = rangeSource(dataSets, headerInZone, labelRange);
  const scatterSource = rangeSource(
    [dataset(numCols[1].zone, getters)],
    numCols[1].headerInZone,
    getUnboundRange(getters, numCols[0].zone)
  );
  const bubble =
    numCols.length === 3
      ? {
          xRange: getUnboundRange(getters, numCols[0].zone),
          yRanges: [getUnboundRange(getters, numCols[1].zone)],
          sizeRange: getUnboundRange(getters, numCols[2].zone),
          labelRange,
          headerInZone,
        }
      : undefined;
  return {
    title,
    source,
    rowCount: labelCol.rowCount,
    numColsCount: numCols.length,
    scatterSource,
    bubble,
  };
}

/** Pattern R — Categorical + Two Numbers (Population Pyramid or Grouped) */
function buildCategoricalTwoNumbersContext(
  [catCol, numCol1, numCol2]: ColumnAnalysis[],
  getters: Getters
): CategoricalTwoNumbersContext {
  const catRange = getUnboundRange(getters, catCol.zone);
  const headerInZone = numCol1.headerInZone || numCol2.headerInZone;
  const catHeader = getCategoryHeader(getters, catCol, headerInZone);
  const title =
    numCol1.title && numCol2.title
      ? _t("%(num1Header)s vs %(num2Header)s by %(catHeader)s", {
          num1Header: numCol1.title,
          num2Header: numCol2.title,
          catHeader,
        })
      : "";
  const isPyramid = isPyramidLike(numCol1, numCol2);
  const sourceBoth = rangeSource(
    [dataset(numCol1.zone, getters, "0"), dataset(numCol2.zone, getters, "1")],
    headerInZone,
    catRange
  );
  return { title, sourceBoth, isPyramid };
}

/** Pattern S — Many Numbers (3+ numeric columns, no categorical/date) */
function buildManyNumbersContext(cols: ColumnAnalysis[], getters: Getters): ManyNumbersContext {
  const title = cols.every((c) => c.headerInZone) ? cols.map((c) => c.title!).join(" / ") : "";
  const headerInZone = cols.some((c) => c.headerInZone);
  const dataSets = cols.map((c, i) => dataset(c.zone, getters, String(i)));
  const source = rangeSource(dataSets, headerInZone);
  const { lastCellXC } = interestingCellsXc(cols[2]);
  const { lastCellXC: firstCellXC } = interestingCellsXc(cols[0]);
  const { lastCellXC: secondCellXC } = interestingCellsXc(cols[1]);
  return {
    title,
    source,
    colsLength: cols.length,
    rowCount: cols[0].rowCount,
    lastCellXC,
    firstCellXC,
    secondCellXC,
  };
}

const NUMBER_OR_PERCENTAGE: readonly ExtendedColumnType[] = ["number", "percentage"];
const EXACT_PATTERNS: ChartSuggestionRule<any>[] = [
  {
    pattern: { leadingTypes: ["number"] },
    buildContext: buildSingleNumberContext,
    suggestions: SINGLE_NUMBER_COLUMN_SUGGESTIONS,
  },
  {
    pattern: { leadingTypes: ["percentage"] },
    buildContext: buildSinglePercentageContext,
    suggestions: SINGLE_PERCENTAGE_COLUMN_SUGGESTIONS,
  },
  {
    pattern: { leadingTypes: ["date"] },
    buildContext: buildSingleDateContext,
    suggestions: SINGLE_DATE_COLUMN_SUGGESTIONS,
  },
  {
    pattern: { leadingTypes: ["categorical"] },
    buildContext: buildSingleCategoricalContext,
    suggestions: SINGLE_CATEGORICAL_COLUMN_SUGGESTIONS,
  },
  {
    pattern: { leadingTypes: ["label"] },
    buildContext: buildSingleLabelContext,
    suggestions: SINGLE_LABEL_COLUMN_SUGGESTIONS,
  },
  {
    pattern: { leadingTypes: ["categorical", "number"] },
    buildContext: buildCategoricalVsNumberContext,
    suggestions: CATEGORICAL_VS_NUMBER_SUGGESTIONS,
  },
  {
    pattern: { leadingTypes: ["date", NUMBER_OR_PERCENTAGE] },
    buildContext: buildDateVsSeriesContext,
    suggestions: DATE_VS_SERIES_SUGGESTIONS,
  },
  {
    pattern: { leadingTypes: ["number", "number"] },
    buildContext: buildNumberVsNumberContext,
    suggestions: NUMBER_VS_NUMBER_SUGGESTIONS,
  },
  {
    pattern: { leadingTypes: ["categorical", "percentage"] },
    buildContext: buildCategoricalVsPercentageContext,
    suggestions: CATEGORICAL_VS_PERCENTAGE_SUGGESTIONS,
  },
  {
    pattern: { leadingTypes: ["label", "number"] },
    buildContext: buildLabelVsNumberContext,
    suggestions: LABEL_VS_NUMBER_SUGGESTIONS,
  },
  {
    pattern: { leadingTypes: ["label", "percentage"] },
    buildContext: buildCategoricalVsPercentageContext,
    suggestions: CATEGORICAL_VS_PERCENTAGE_SUGGESTIONS,
  },
  {
    pattern: { leadingTypes: ["categorical", "categorical", "number"] },
    buildContext: buildMultipleCategoricalsVsNumberContext,
    suggestions: MULTIPLE_CATEGORICALS_VS_NUMBER_SUGGESTIONS,
  },
  {
    pattern: { leadingTypes: ["categorical", "label", "number"] },
    buildContext: buildMultipleCategoricalsVsNumberContext,
    suggestions: MULTIPLE_CATEGORICALS_VS_NUMBER_SUGGESTIONS,
  },
  {
    pattern: { leadingTypes: ["categorical", "date", NUMBER_OR_PERCENTAGE] },
    buildContext: buildCategoricalDateNumberContext,
    suggestions: CATEGORICAL_DATE_NUMBER_SUGGESTIONS,
  },
  {
    pattern: { leadingTypes: ["categorical", NUMBER_OR_PERCENTAGE, NUMBER_OR_PERCENTAGE] },
    buildContext: buildCategoricalTwoNumbersContext,
    suggestions: CATEGORICAL_TWO_NUMBERS_SUGGESTIONS,
  },
];

// Open-ended shapes: a literal set of leading types followed by one or more columns matching `extension.type`.
// Tried only once no EXACT_PATTERNS entry matches.
const EXTENDABLE_PATTERNS: ChartSuggestionRule<any>[] = [
  {
    pattern: { leadingTypes: [], extension: { type: NUMBER_OR_PERCENTAGE, minSize: 3 } },
    buildContext: buildManyNumbersContext,
    suggestions: MANY_NUMBERS_SUGGESTIONS,
  },
  {
    pattern: { leadingTypes: ["label"], extension: { type: NUMBER_OR_PERCENTAGE, minSize: 2 } },
    buildContext: buildLabelVsMultipleNumbersContext,
    suggestions: LABEL_VS_MULTIPLE_NUMBERS_SUGGESTIONS,
  },
  {
    pattern: {
      leadingTypes: ["categorical"],
      extension: { type: NUMBER_OR_PERCENTAGE, minSize: 2 },
    },
    buildContext: buildCategoricalVsMultipleNumbersContext,
    suggestions: CATEGORICAL_VS_MULTIPLE_NUMBERS_SUGGESTIONS,
  },
  {
    pattern: { leadingTypes: ["date"], extension: { type: NUMBER_OR_PERCENTAGE, minSize: 2 } },
    buildContext: buildDateVsMultipleNumbersContext,
    suggestions: DATE_VS_MULTIPLE_NUMBERS_SUGGESTIONS,
  },
];

export function getChartSuggestions(zones: Zone[], getters: Getters): ChartSuggestion[] {
  const cols = analyzeColumns(zones, getters);
  if (cols.some((c) => c.type === "error")) {
    return [];
  }
  const nonEmpty = cols.filter((c) => c.type !== "empty");
  if (!nonEmpty.length) {
    return [];
  }

  const shape = nonEmpty.map((c) => c.type);
  const rule =
    EXACT_PATTERNS.find((rule) => matchesShape(rule.pattern, shape)) ??
    EXTENDABLE_PATTERNS.find((rule) => matchesShape(rule.pattern, shape));
  if (!rule) {
    return [];
  }
  const ctx = rule.buildContext(nonEmpty, getters);
  return rule.suggestions
    .filter((suggestion) => suggestion.isApplicable?.(ctx) ?? true)
    .map((suggestion) => ({
      description: suggestion.description.toString(),
      definition: suggestion.build(ctx),
    }));
}
