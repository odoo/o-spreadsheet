import { computed, signal } from "@odoo/owl";
import { analyzeColumns } from "../../../helpers/data_statistics/data_analysis";
import { DateGranularity, StatValue } from "../../../helpers/data_statistics/statistics_items";
import {
  buildBooleanItems,
  buildDateStatSections,
  buildGeneralStatItems,
  buildOccurrencesItems,
} from "../../../helpers/data_statistics/statistics_suggestion";
import { getChartSuggestions } from "../../../helpers/figures/charts/chart_suggestion_engine";
import { cellsSortingCriterion } from "../../../helpers/sort";
import { OwlPluginWithModel } from "../../../owl_plugins/owl_plugin_with_model";
import { CellValueType } from "../../../types/cells";

const OCCURRENCES_PAGE_SIZE = 50;

export type DateOccurenceSortType = "desc" | "asc" | "chrono";
export interface OccurrencesSortType {
  sortOn: "name" | "value";
  order: "asc" | "desc" | "none";
}

export class DataAnalysisPlugin extends OwlPluginWithModel {
  generalStatItems = computed(() => {
    if (this.hasData() && this.shape().length === 1) {
      const col = this.analyzedColumns()[0];
      return buildGeneralStatItems(
        this.model().getters,
        col,
        this.model().getters.getActiveSheetId()
      );
    }
    return [];
  });

  occurrencesItems = computed(() => {
    if (this.hasData() && this.shape().length === 1) {
      const col = this.analyzedColumns()[0];
      const sheetId = this.model().getters.getActiveSheetId();
      switch (col.type) {
        case "boolean":
          return buildBooleanItems(this.model().getters, col, sheetId);
        default:
          return buildOccurrencesItems(this.model().getters, col, sheetId);
      }
    }
    return [];
  });

  dateStatSections = computed(() => {
    if (this.hasData() && this.shape().length === 1) {
      const col = this.analyzedColumns()[0];
      const sheetId = this.model().getters.getActiveSheetId();
      switch (col.type) {
        case "date":
          return buildDateStatSections(this.model().getters, col, sheetId);
        default:
          return this.defaultDateSections;
      }
    }
    return this.defaultDateSections;
  });

  dateGranularity = signal<DateGranularity>("month");
  dateOccurenceSortType = signal<DateOccurenceSortType>("chrono");
  displayedDateItems = computed(() => {
    const items = [...this.dateStatSections()[this.dateGranularity()]];
    switch (this.dateOccurenceSortType()) {
      case "asc":
        items.sort((a, b) => Number(a.value) - Number(b.value) || a.name.localeCompare(b.name));
        break;
      case "desc":
        items.sort((a, b) => Number(b.value) - Number(a.value) || a.name.localeCompare(b.name));
        break;
    }
    return items;
  });
  occurrencesSortType = signal.Object<OccurrencesSortType>({ sortOn: "value", order: "desc" });

  sortedOccurrencesItems = computed(() => {
    const { sortOn, order } = this.occurrencesSortType();
    const items = [...this.occurrencesItems()];
    if (order !== "none") {
      items.sort((a, b) => {
        if (sortOn === "name") {
          return order === "desc" ? compareCategories(b, a) : compareCategories(a, b);
        }
        return order === "asc"
          ? Number(a.value) - Number(b.value)
          : Number(b.value) - Number(a.value);
      });
    }
    return items;
  });

  private numberOfDisplayedOccurrences = signal(OCCURRENCES_PAGE_SIZE);
  displayedOccurrencesItems = computed(() =>
    this.sortedOccurrencesItems().slice(0, this.numberOfDisplayedOccurrences())
  );
  hasMoreOccurrences = computed(
    () => this.sortedOccurrencesItems().length > this.numberOfDisplayedOccurrences()
  );

  private analyzedColumns = computed(() => {
    const zones = this.model().getters.getSelectedZones();
    return analyzeColumns(zones, this.model().getters);
  });

  hasData = computed(() => {
    const sheetId = this.model().getters.getActiveSheetId();
    const zones = this.model().getters.getSelectedZones();
    return zones.some((zone) =>
      this.model()
        .getters.getEvaluatedCellsInZone(sheetId, zone)
        .some((cell) => cell.type !== CellValueType.empty)
    );
  });

  hasHeader = computed(() => {
    return this.analyzedColumns().some((c) => c.headerInZone);
  });

  shape = computed(() => this.analyzedColumns().map((col) => col.type));

  chartSuggestions = computed(() => {
    return this.hasData()
      ? getChartSuggestions(this.shape(), this.analyzedColumns(), this.model().getters)
      : [];
  });

  setDateGranularity(granularity: DateGranularity) {
    this.dateGranularity.set(granularity);
  }

  toggleDateSort() {
    switch (this.dateOccurenceSortType()) {
      case "desc":
        this.dateOccurenceSortType.set("chrono");
        break;
      case "asc":
        this.dateOccurenceSortType.set("desc");
        break;
      case "chrono":
        this.dateOccurenceSortType.set("asc");
        break;
    }
  }

  toggleOccurrencesSort(sortOn: "name" | "value") {
    const sortType = this.occurrencesSortType();
    if (sortType.sortOn !== sortOn) {
      this.occurrencesSortType.set({ sortOn, order: "asc" });
    } else {
      switch (sortType.order) {
        case "desc":
          this.occurrencesSortType.set({ sortOn, order: "none" });
          break;
        case "asc":
          this.occurrencesSortType.set({ sortOn, order: "desc" });
          break;
        case "none":
          this.occurrencesSortType.set({ sortOn, order: "asc" });
          break;
      }
    }
  }

  loadMoreOccurrences() {
    this.numberOfDisplayedOccurrences.set(
      this.numberOfDisplayedOccurrences() + OCCURRENCES_PAGE_SIZE
    );
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
}

const sortCategoriesAscending = cellsSortingCriterion("asc");

function compareCategories(a: StatValue, b: StatValue): number {
  if (a.rawData && b.rawData) {
    return sortCategoriesAscending(a.rawData, b.rawData);
  }
  return a.name.localeCompare(b.name);
}
