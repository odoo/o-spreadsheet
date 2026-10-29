import { invalidateEvaluationCommands } from "../../../command_registry";
import {
  analyzeColumns,
  ExtendedColumnType,
  hasSameRowSpan,
} from "../../../helpers/data_statistics/data_analysis";
import {
  DateGranularity,
  DateSections,
  StatValue,
} from "../../../helpers/data_statistics/statistics_items";
import {
  buildBooleanItems,
  buildDateStatSections,
  buildGeneralStatItems,
  buildOccurrencesItems,
  buildSumByCategoryItems,
  buildSumByDateSections,
} from "../../../helpers/data_statistics/statistics_suggestion";
import {
  ChartSuggestion,
  getChartSuggestions,
  RulePattern,
} from "../../../helpers/figures/charts/chart_suggestion_engine";

import { ColumnAnalysis } from "../../../helpers/data_statistics/data_analysis";
import { matchesShape } from "../../../helpers/figures/charts/chart_suggestion_engine";
import { cellsSortingCriterion } from "../../../helpers/sort";
import { SpreadsheetStore } from "../../../stores/spreadsheet_store";
import { CellValueType } from "../../../types/cells";
import { Command } from "../../../types/commands";
import { Getters } from "../../../types/getters";
import { Get } from "../../../types/store_engine";

// ------------------------------------------------------------------------------------
// Statistic rules
//
// The shape of the selection (the tuple of each column's ExtendedColumnType, with
// the value columns moved after the category columns) is matched against
// SELECTION_PATTERNS to decide which statistics to show.
// Rules only apply to a single zone or to two vertically aligned zones.
// ------------------------------------------------------------------------------------

/** A StatItemBuilder links a column pattern to the helper that computes its statistics
 *  and to the store field (`target`) where the result is stored.
 */
interface StatItemBuilder<T> {
  pattern: RulePattern;
  buildStatHelper: (getters: Getters, columns: ColumnAnalysis[], sheetId: string) => T;
  target: "generalStatItems" | "aggregatedStatItems" | "dateStatSections";
}

const CATEGORICAL_OR_LABEL_OR_BOOLEAN: readonly ExtendedColumnType[] = [
  "categorical",
  "label",
  "boolean",
];
const CATEGORICAL_OR_LABEL_OR_NUMBER_OR_PERCENTAGE: readonly ExtendedColumnType[] = [
  "categorical",
  "label",
  "number",
  "percentage",
];
const NUMBER_OR_PERCENTAGE: readonly ExtendedColumnType[] = ["number", "percentage"];
const ANY_TYPE: readonly ExtendedColumnType[] = [
  "number",
  "percentage",
  "date",
  "categorical",
  "label",
  "boolean",
];

const SELECTION_PATTERNS: StatItemBuilder<any>[] = [
  // Single column of any type: general statistics (count, sum, average…)
  {
    pattern: { leadingTypes: [ANY_TYPE] },
    buildStatHelper: buildGeneralStatItems,
    target: "generalStatItems",
  },
  // Single date column: occurrences per period
  {
    pattern: { leadingTypes: ["date"] },
    buildStatHelper: buildDateStatSections,
    target: "dateStatSections",
  },
  // Single boolean column: TRUE/FALSE occurrences
  {
    pattern: { leadingTypes: ["boolean"] },
    buildStatHelper: buildBooleanItems,
    target: "aggregatedStatItems",
  },
  // Single categorical, label or numeric column: occurrences per value
  {
    pattern: { leadingTypes: [CATEGORICAL_OR_LABEL_OR_NUMBER_OR_PERCENTAGE] },
    buildStatHelper: buildOccurrencesItems,
    target: "aggregatedStatItems",
  },
  // Category + number columns: sum of the values per category
  {
    pattern: { leadingTypes: [CATEGORICAL_OR_LABEL_OR_BOOLEAN, NUMBER_OR_PERCENTAGE] },
    buildStatHelper: buildSumByCategoryItems,
    target: "aggregatedStatItems",
  },
  // Date + number columns: sum of the values per period
  {
    pattern: { leadingTypes: ["date", NUMBER_OR_PERCENTAGE] },
    buildStatHelper: buildSumByDateSections,
    target: "dateStatSections",
  },
];

const AGGREGATED_STAT_PAGE_SIZE = 50;
export type DateSortType = "desc" | "asc" | "chrono";
export interface AggregatedStatSortType {
  sortOn: "name" | "value";
  order: "asc" | "desc" | "none";
}

export class DataAnalysisStore extends SpreadsheetStore {
  mutators = [
    "setDateGranularity",
    "toggleDateSort",
    "toggleAggregatedStatSort",
    "loadMoreAggregatedStatItems",
  ] as const;

  shape: ExtendedColumnType[] = [];
  hasHeader: boolean = false;
  generalStatItems: StatValue[] = [];
  aggregatedStatItems: StatValue[] = [];
  dateStatSections: DateSections = this.defaultDateSections;

  dateGranularity: DateGranularity = "month";
  dateSortType: DateSortType = "chrono";
  displayedDateItems: StatValue[] = [];

  aggregatedStatSortType: AggregatedStatSortType = { sortOn: "value", order: "desc" };
  numberOfDisplayedAggregatedStatItems = AGGREGATED_STAT_PAGE_SIZE;
  displayedAggregatedStatItems: StatValue[] = [];
  hasMoreAggregatedStatItems = false;

  groupingColumnIndex?: number;
  hasData: boolean = false;
  chartSuggestions: ChartSuggestion[] = [];
  private isDirty = false;

  constructor(get: Get) {
    super(get);
    this.model.selection.observe(this, {
      handleEvent: () => this.refresh(),
    });
    this.onDispose(() => {
      this.model.selection.unobserve(this);
    });
    this.refresh();
  }

  handle(cmd: Command) {
    if (
      invalidateEvaluationCommands.has(cmd.type) ||
      (cmd.type === "UPDATE_CELL" && ("content" in cmd || "format" in cmd))
    ) {
      this.isDirty = true;
    }
    switch (cmd.type) {
      case "HIDE_COLUMNS_ROWS":
      case "UNHIDE_COLUMNS_ROWS":
      case "GROUP_HEADERS":
      case "UNGROUP_HEADERS":
      case "ACTIVATE_SHEET":
      case "ACTIVATE_NEXT_SHEET":
      case "ACTIVATE_PREVIOUS_SHEET":
      case "EVALUATE_CELLS":
      case "SET_FORMATTING":
      case "CLEAR_FORMATTING":
        this.isDirty = true;
        break;
    }
  }

  finalize() {
    if (this.isDirty) {
      this.refresh();
      this.isDirty = false;
    }
  }

  setDateGranularity(granularity: DateGranularity) {
    this.dateGranularity = granularity;
    this.sortDateItems();
  }

  toggleDateSort() {
    switch (this.dateSortType) {
      case "desc":
        this.dateSortType = "chrono";
        break;
      case "asc":
        this.dateSortType = "desc";
        break;
      case "chrono":
        this.dateSortType = "asc";
        break;
    }
    this.sortDateItems();
  }

  toggleAggregatedStatSort(sortOn: "name" | "value") {
    const sortType = this.aggregatedStatSortType;
    if (sortType.sortOn !== sortOn) {
      this.aggregatedStatSortType = { sortOn, order: "asc" };
    } else {
      switch (sortType.order) {
        case "desc":
          this.aggregatedStatSortType = { sortOn, order: "none" };
          break;
        case "asc":
          this.aggregatedStatSortType = { sortOn, order: "desc" };
          break;
        case "none":
          this.aggregatedStatSortType = { sortOn, order: "asc" };
          break;
      }
    }
    this.sortAggregatedStatItems();
  }

  loadMoreAggregatedStatItems() {
    this.numberOfDisplayedAggregatedStatItems += AGGREGATED_STAT_PAGE_SIZE;
    this.sortAggregatedStatItems();
  }

  private sortDateItems() {
    const items = [...this.dateStatSections[this.dateGranularity]];
    switch (this.dateSortType) {
      case "asc":
        items.sort((a, b) => a.rawValue - b.rawValue || a.name.localeCompare(b.name));
        break;
      case "desc":
        items.sort((a, b) => b.rawValue - a.rawValue || a.name.localeCompare(b.name));
        break;
    }
    this.displayedDateItems = items;
  }

  private sortAggregatedStatItems() {
    const { sortOn, order } = this.aggregatedStatSortType;
    const items = [...this.aggregatedStatItems];
    if (order !== "none") {
      items.sort((a, b) => {
        if (sortOn === "name") {
          return order === "desc" ? compareCategories(b, a) : compareCategories(a, b);
        }
        return order === "asc" ? a.rawValue - b.rawValue : b.rawValue - a.rawValue;
      });
    }
    this.displayedAggregatedStatItems = items.slice(0, this.numberOfDisplayedAggregatedStatItems);
    this.hasMoreAggregatedStatItems = items.length > this.numberOfDisplayedAggregatedStatItems;
  }

  get defaultDateSections() {
    return {
      year: [],
      quarter: [],
      month: [],
      week: [],
      weekday: [],
      day: [],
      date: [],
    };
  }

  get hasStatistics() {
    return (
      this.generalStatItems.length ||
      this.displayedAggregatedStatItems.length > 0 ||
      this.displayedDateItems.length > 0
    );
  }

  private refresh() {
    const sheetId = this.getters.getActiveSheetId();
    const zones = this.getters.getSelectedZones();

    this.hasData = zones.some((zone) =>
      this.getters
        .getEvaluatedCellsInZone(sheetId, zone)
        .some((cell) => cell.type !== CellValueType.empty)
    );
    const cols = analyzeColumns(zones, this.getters);
    this.shape = cols.map((c) => c.type);
    this.hasHeader = cols.some((c) => c.headerInZone);
    this.groupingColumnIndex = undefined;

    const suggestions = this.hasData ? getChartSuggestions(this.shape, cols, this.getters) : [];
    this.chartSuggestions = suggestions;
    this.generalStatItems = [];
    this.aggregatedStatItems = [];
    this.dateStatSections = this.defaultDateSections;

    if (hasSameRowSpan(zones)) {
      const categories = cols.filter((c) => !NUMBER_OR_PERCENTAGE.includes(c.type));
      const values = cols.filter((c) => NUMBER_OR_PERCENTAGE.includes(c.type));
      const orderedCols = [...categories, ...values];

      const matchedRules = SELECTION_PATTERNS.filter((rule) =>
        matchesShape(
          rule.pattern,
          orderedCols.map((c) => c.type)
        )
      );
      if (matchedRules.length) {
        // After ordering, the first column is the one the statistics are grouped by
        this.groupingColumnIndex = orderedCols[0].zone.left;
      }
      for (const rule of matchedRules) {
        this[rule.target] = rule.buildStatHelper(this.getters, orderedCols, sheetId);
      }
    }

    this.sortAggregatedStatItems();
    this.sortDateItems();
  }
}

const sortCategoriesAscending = cellsSortingCriterion("asc");
function compareCategories(a: StatValue, b: StatValue): number {
  if (a.rawData && b.rawData) {
    return sortCategoriesAscending(a.rawData, b.rawData);
  }
  return a.name.localeCompare(b.name);
}
