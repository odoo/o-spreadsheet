import { analyzeColumns } from "../../../helpers/data_analysis";
import { StatSection } from "../../../helpers/data_statistics/statistics_items";
import { buildStatSections } from "../../../helpers/data_statistics/statistics_suggestion";
import { zoneToXc } from "../../../helpers/zones";
import { SpreadsheetStore } from "../../../stores/spreadsheet_store";
import { CellValueType } from "../../../types/cells";
import { Command, invalidateEvaluationCommands } from "../../../types/commands";
import { Get } from "../../../types/store_engine";

export class DataAnalysisStore extends SpreadsheetStore {
  mutators = [] as const;
  section: StatSection | undefined = undefined;
  hasData: boolean = false;
  private isDirty = false;
  ranges?: string[];

  constructor(get: Get) {
    super(get);
    this.model.selection.observe(this, {
      handleEvent: () => this.refreshStatistics(),
    });
    this.onDispose(() => {
      this.model.selection.unobserve(this);
    });
    this.refreshStatistics();
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
        this.isDirty = true;
    }
  }

  finalize() {
    if (this.isDirty) {
      this.isDirty = false;
      this.refreshStatistics();
    }
  }

  private refreshStatistics() {
    const getters = this.getters;
    const sheetId = getters.getActiveSheetId();
    const zones = getters.getSelectedZones();
    this.ranges = zones.map(zoneToXc);

    this.hasData = zones.some((zone) =>
      getters
        .getEvaluatedCellsInZone(sheetId, zone)
        .some((cell) => cell.type !== CellValueType.empty)
    );
    if (!this.hasData) {
      this.section = undefined;
      return;
    }

    const cols = analyzeColumns(zones, getters);
    const nonEmpty = cols.filter((c) => c.type !== "empty");
    this.section = buildStatSections(this.getters, nonEmpty, sheetId);
  }
}
