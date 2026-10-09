import { analyzeColumns, ExtendedColumnType } from "../../../helpers/data_statistics/data_analysis";
import {
  DateGranularity,
  DateSections,
  StatValue,
} from "../../../helpers/data_statistics/statistics_items";
import {
  buildBooleanItems,
  buildCategorySumItems,
  buildDateStatSections,
  buildGeneralStatItems,
  buildGroupedDateSections,
  buildOccurrencesItems,
} from "../../../helpers/data_statistics/statistics_suggestion";
import {
  ChartSuggestion,
  getChartSuggestions,
} from "../../../helpers/figures/charts/chart_suggestion_engine";
import { zoneToXc } from "../../../helpers/zones";
import { SpreadsheetStore } from "../../../stores/spreadsheet_store";
import { CellValueType } from "../../../types/cells";
import { Command, invalidateEvaluationCommands } from "../../../types/commands";
import { Get } from "../../../types/store_engine";

const OCCURRENCES_PAGE_SIZE = 50;

export type DateSortType = "desc" | "asc" | "chrono";
export interface OccurrencesSortType {
  sortOn: "name" | "value";
  order: "asc" | "desc" | "none";
}

// TODO MAWAT: not correct either, use raw value
function cleanFormatStatValue(stat: StatValue): number {
  const cleanedStatValue = String(stat.value).replace(/[^0-9-]/g, "");
  return parseFloat(cleanedStatValue);
}

export class DataAnalysisStore extends SpreadsheetStore {
  mutators = [
    "setDateGranularity",
    "toggleDateSort",
    "toggleOccurrencesSort",
    "loadMoreOccurrences",
  ] as const;
  shape: ExtendedColumnType[] = [];
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
    switch (this.dateSortType) {
      case "asc":
        items.sort(
          (a, b) =>
            cleanFormatStatValue(a) - cleanFormatStatValue(b) || a.name.localeCompare(b.name)
        );
        break;
      case "desc":
        items.sort(
          (a, b) =>
            cleanFormatStatValue(b) - cleanFormatStatValue(a) || a.name.localeCompare(b.name)
        );
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
          return order === "desc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        }
        return order === "asc"
          ? cleanFormatStatValue(a) - cleanFormatStatValue(b) || a.name.localeCompare(b.name)
          : cleanFormatStatValue(b) - cleanFormatStatValue(a) || a.name.localeCompare(b.name);
      });
    }
    this.displayedOccurrencesItems = items.slice(0, this.numberOfDisplayedOccurrences);
    this.hasMoreOccurrences = items.length > this.numberOfDisplayedOccurrences;
  }

  get defaultDateSections() {
    return {
      year: [],
      month: [],
      day: [],
    };
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
    } else {if (
      (this.hasData && cols.length === 2 && zones.length === 1) ||
      (zones.length === 2 && zones[0].top === zones[1].top && zones[0].bottom === zones[1].bottom)
    ) {
      const leftCol = cols[0];
      const rightCol = cols[1];
      this.generalStatItems = [];
      this.dateStatSections = buildGroupedDateSections(this.getters, leftCol, rightCol, sheetId);
      this.occurrencesItems = buildCategorySumItems(this.getters, leftCol, rightCol, sheetId);
    }}
  }
}
