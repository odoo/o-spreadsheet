import { analyzeColumns } from "../../../helpers/data_statistics/data_analysis";
import { StatSection } from "../../../helpers/data_statistics/statistics_items";
import { buildStatSections } from "../../../helpers/data_statistics/statistics_suggestion";
import {
  ChartSuggestion,
  getChartSuggestions,
} from "../../../helpers/figures/charts/chart_suggestion_engine";
import { zoneToXc } from "../../../helpers/zones";
import { SpreadsheetStore } from "../../../stores/spreadsheet_store";
import { CellValueType } from "../../../types/cells";
import { Command, invalidateEvaluationCommands } from "../../../types/commands";
import { Get } from "../../../types/store_engine";

export class DataAnalysisStore extends SpreadsheetStore {
  mutators = [] as const;
  shape: String[] = [];
  statSections: StatSection[] | undefined = undefined;
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
    const nonEmpty = cols.filter((c) => c.type !== "empty");

    const suggestions = this.hasData ? getChartSuggestions(nonEmpty, this.getters) : [];
    this.chartSuggestions = suggestions;
    if (!this.hasData) {
      this.statSections = undefined;
      return;
    }
    this.statSections = buildStatSections(this.getters, nonEmpty, sheetId);
  }
}
