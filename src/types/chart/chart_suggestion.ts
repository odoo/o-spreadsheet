import { ChartDefinition, ChartRangeDataSource } from "./chart";

export interface Suggestion<T> {
  description: string;
  /** Defaults to always-applicable. */
  isApplicable?: (ctx: T) => boolean;
  build: (ctx: T) => ChartDefinition;
}

/** Pattern A — Single numeric column */
export interface SingleNumberContext {
  title: string;
  source: ChartRangeDataSource<string>;
  rowCount: number;
  firstCellXC: string;
  lastCellXC: string;
  prevCellXC?: string;
}

/** Pattern B — Single percentage column */
export interface SinglePercentageContext {
  title: string;
  source: ChartRangeDataSource<string>;
  rowCount: number;
  firstCellXC: string;
  lastCellXC: string;
  prevCellXC?: string;
  isAboveOne: boolean;
}

/** Pattern C — Single date column */
export interface SingleDateContext {
  title: string;
  lastCellXC: string;
  rowCount: number;
}

/** Pattern D — Single categorical column */
export interface SingleCategoricalContext {
  title: string;
  source: ChartRangeDataSource<string>;
  range: string;
}

/** Pattern E — Single label column */
export interface SingleLabelContext {
  title: string;
  lastCellXC: string;
  rowCount: number;
}

/** Pattern F — Categorical + Number */
export interface CategoricalVsNumberContext {
  title: string;
  source: ChartRangeDataSource<string>;
  treemapSource: ChartRangeDataSource<string>;
}

/** Patterns G & J — Date + Number or Date + Percentage */
export interface DateVsSeriesContext {
  title: string;
  source: ChartRangeDataSource<string>;
  isPercentage: boolean;
}

/** Pattern H — Number + Number */
export interface NumberVsNumberContext {
  title: string;
  source2: ChartRangeDataSource<string>;
  sourceBoth: ChartRangeDataSource<string>;
  rowCount1: number;
  rowCount2: number;
  lastCellXC: string;
  prevCellXC?: string;
}

/** Pattern I — Categorical + Percentage */
export interface CategoricalVsPercentageContext {
  title: string;
  source: ChartRangeDataSource<string>;
  rowCount: number;
}

/** Pattern K — Label + Number */
export interface LabelVsNumberContext {
  title: string;
  source: ChartRangeDataSource<string>;
  rowCount: number;
  lastCellXC: string;
  prevCellXC?: string;
}

/** Pattern M — Categorical + Multiple Numbers */
export interface CategoricalVsMultipleNumbersContext {
  title: string;
  source: ChartRangeDataSource<string>;
  rowCount: number;
}

/** Pattern N — Date + Multiple Numbers */
export interface DateVsMultipleNumbersContext {
  title: string;
  source: ChartRangeDataSource<string>;
}

/** Pattern O — Categorical + Categorical + Number */
export interface MultipleCategoricalsVsNumberContext {
  title: string;
  hierarchySource: ChartRangeDataSource<string>;
  barSource: ChartRangeDataSource<string>;
}

/** Pattern P — Categorical + Date + Number */
export interface CategoricalDateNumberContext {
  title: string;
  sourceByDate: ChartRangeDataSource<string>;
  sourceByCat: ChartRangeDataSource<string>;
}

/** Pattern Q — Label + Multiple Numbers */
export interface LabelVsMultipleNumbersContext {
  title: string;
  source: ChartRangeDataSource<string>;
  rowCount: number;
  numColsCount: number;
  /** Always defined: this rule only fires with >= 2 numeric columns (open-ended shape, min 3 total). */
  scatterSource: ChartRangeDataSource<string>;
  /** Only defined when numColsCount === 3 (Bubble Chart's isApplicable guards its use). */
  bubble?: {
    xRange: string;
    yRanges: string[];
    sizeRange: string;
    labelRange: string;
    hasTitle: boolean;
  };
}

/** Pattern R — Categorical + Two Numbers (Population Pyramid or Grouped) */
export interface CategoricalTwoNumbersContext {
  title: string;
  sourceBoth: ChartRangeDataSource<string>;
  isPyramid: boolean;
}

/** Pattern S — Many Numbers (3+ numeric columns, no categorical/date) */
export interface ManyNumbersContext {
  title: string;
  source: ChartRangeDataSource<string>;
  colsLength: number;
  rowCount: number;
  lastCellXC: string;
  firstCellXC: string;
  secondCellXC: string;
}
