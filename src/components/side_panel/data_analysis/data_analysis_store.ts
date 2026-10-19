import { invalidateEvaluationCommands } from "../../../command_registry";
import {
  analyzeColumns,
  ExtendedColumnType,
  getCategoryAndValueColumns,
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
  buildGroupedDateSections as buildSumByDateItems,
} from "../../../helpers/data_statistics/statistics_suggestion";
import {
  ChartSuggestion,
  getChartSuggestions,
} from "../../../helpers/figures/charts/chart_suggestion_engine";
import { cellsSortingCriterion } from "../../../helpers/sort";
import { zoneToXc } from "../../../helpers/zones";
import { SpreadsheetStore } from "../../../stores/spreadsheet_store";
import { _t } from "../../../translation";
import { CellValueType } from "../../../types/cells";
import { Command } from "../../../types/commands";
import { Get } from "../../../types/store_engine";

const OCCURRENCES_PAGE_SIZE = 50;

export type DateSortType = "desc" | "asc" | "chrono";
export interface OccurrencesSortType {
  sortOn: "name" | "value";
  order: "asc" | "desc" | "none";
}

// TODO MAWAT: not correct either, use raw value
// MAWAT : removed falsy regex cleaning function

export class DataAnalysisStore extends SpreadsheetStore {
  mutators = [
    "setDateGranularity",
    "toggleDateSort",
    "toggleOccurrencesSort",
    "loadMoreOccurrences",
  ] as const;
  shape: ExtendedColumnType[] = [];
  hasHeader: boolean = false;
  generalStatItems: StatValue[] = [];
  occurrencesItems: StatValue[] = [];
  dateStatSections: DateSections = this.defaultDateSections;

  dateGranularity: DateGranularity = "month";
  dateSortType: DateSortType = "chrono";
  displayedDateItems: StatValue[] = [];

  occurrencesSortType: OccurrencesSortType = { sortOn: "value", order: "desc" };
  numberOfDisplayedOccurrences = OCCURRENCES_PAGE_SIZE;
  displayedOccurrencesItems: StatValue[] = [];
  hasMoreOccurrences = false;

  hasData: boolean = false;
  chartSuggestions: ChartSuggestion[] = [];
  private isDirty = false;
  ranges?: string[];

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
        this.dateSortType = "asc";
        break;
      case "asc":
        this.dateSortType = "chrono";
        break;
      case "chrono":
        this.dateSortType = "desc";
        break;
    }
    this.sortDateItems();
  }

  toggleOccurrencesSort(sortOn: "name" | "value") {
    const sortType = this.occurrencesSortType;
    if (sortType.sortOn !== sortOn) {
      this.occurrencesSortType = { sortOn, order: "desc" };
    } else {
      switch (sortType.order) {
        case "desc":
          this.occurrencesSortType = { sortOn, order: "asc" };
          break;
        case "asc":
          this.occurrencesSortType = { sortOn, order: "none" };
          break;
        case "none":
          this.occurrencesSortType = { sortOn, order: "desc" };
          break;
      }
    }
    this.sortOccurrencesItems();
  }

  loadMoreOccurrences() {
    this.numberOfDisplayedOccurrences += OCCURRENCES_PAGE_SIZE;
    this.sortOccurrencesItems();
  }

  private sortDateItems() {
    const items = [...this.dateStatSections[this.dateGranularity]];
    // TODO MAWAT: if there is tranformation to do, first transform, then sort
    // MAWAT : removed cleaning function inside and replaced it with cast of rawValue property but not ideal, have to pass number value directly. Anyway matho-anthe branch has new compare method => check
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

  private sortOccurrencesItems() {
    const { sortOn, order } = this.occurrencesSortType;
    const items = [...this.occurrencesItems];
    if (order !== "none") {
      items.sort((a, b) => {
        if (sortOn === "name") {
          return order === "asc" ? compareCategories(a, b) : compareCategories(b, a);
        }
        return order === "asc" ? a.rawValue - b.rawValue : b.rawValue - a.rawValue;
      });
    }
    this.displayedOccurrencesItems = items.slice(0, this.numberOfDisplayedOccurrences);
    this.hasMoreOccurrences = items.length > this.numberOfDisplayedOccurrences;
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

  get sectionTitle(): string {
    return this.shape.length === 2 ? _t("Sums") : _t("Occurrences");
  }

  private refresh() {
    const sheetId = this.getters.getActiveSheetId();
    const zones = this.getters.getSelectedZones();
    this.ranges = zones.map(zoneToXc);

    this.hasData = zones.some((zone) =>
      this.getters
        .getEvaluatedCellsInZone(sheetId, zone)
        .some((cell) => cell.type !== CellValueType.empty)
    );
    const cols = analyzeColumns(zones, this.getters);
    this.shape = cols.map((c) => c.type);
    this.hasHeader = cols.some((c) => c.headerInZone);

    const suggestions = this.hasData ? getChartSuggestions(this.shape, cols, this.getters) : [];
    this.chartSuggestions = suggestions;
    this.generalStatItems = [];
    this.occurrencesItems = [];
    this.dateStatSections = this.defaultDateSections;
    if (this.hasData && this.shape.length === 1) {
      const col = cols[0];
      this.generalStatItems = buildGeneralStatItems(this.getters, col, sheetId);
      switch (col.type) {
        case "date":
          this.dateStatSections = buildDateStatSections(this.getters, col, sheetId);
          break;
        case "boolean":
          this.occurrencesItems = buildBooleanItems(this.getters, col, sheetId);
          break;
        default:
          this.occurrencesItems = buildOccurrencesItems(this.getters, col, sheetId);
      }
    } else {
      if (
        this.hasData &&
        cols.length === 2 &&
        (zones.length === 1 ||
          (zones.length === 2 &&
            zones[0].top === zones[1].top &&
            zones[0].bottom === zones[1].bottom))
      ) {
        const columnsData = getCategoryAndValueColumns(cols);

        // 1 txt/date + number
        if (columnsData?.categoryColumn && columnsData.valueColumn) {
          const { categoryColumn, valueColumn } = columnsData;

          this.shape = [categoryColumn.type, valueColumn.type];
          this.generalStatItems = [];

          if (categoryColumn.type === "date") {
            this.occurrencesItems = [];
            this.dateStatSections = buildSumByDateItems(
              this.getters,
              categoryColumn,
              valueColumn,
              sheetId
            );
          } else {
            this.occurrencesItems = buildSumByCategoryItems(
              this.getters,
              categoryColumn,
              valueColumn,
              sheetId
            );
            this.dateStatSections = this.defaultDateSections;
          }
        } else {
          // 2 txt or 2 numbers
          this.shape = cols.map((c) => c.type);
          this.occurrencesItems = [];
          this.dateStatSections = this.defaultDateSections;
        }
      }
    }
    this.sortOccurrencesItems();
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
