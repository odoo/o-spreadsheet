import { analyzeColumns, ColumnAnalysis } from "../../../helpers/data_analysis";
import { StatSection } from "../../../helpers/data_statistics/statistics_items";
import { buildStatSections } from "../../../helpers/data_statistics/statistics_suggestion";
import { zoneToXc } from "../../../helpers/zones";
import { SpreadsheetStore } from "../../../stores/spreadsheet_store";
import { Command, invalidateEvaluationCommands } from "../../../types/commands";
import { Get } from "../../../types/store_engine";

export class DataAnalysisStore extends SpreadsheetStore {
  mutators = [] as const;
  /** One section per individual column (drives the column selector). */
  perColSections: StatSection[] = [];
  /** Raw analysis backing each entry of perColSections, same order/indices. */
  perColAnalysis: ColumnAnalysis[] = [];
  hasData: boolean = false;
  private isDirty = false;
  ranges?: string[];

  constructor(get: Get) {
    super(get);
    this.model.selection.observe(this, {
      handleEvent: () => {
        const zones = this.getters.getSelectedZones();
        this.ranges = zones.map(zoneToXc);
        this.refreshStatistics();
      },
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
      case "UNDO":
      case "REDO":
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
    this.ranges = getters.getSelectedZones().map(zoneToXc);

    if (!this.ranges?.length) {
      this.perColSections = [];
      this.perColAnalysis = [];
      this.hasData = false;
      return;
    }

    const rangesArg = this.ranges.join(",");
    const countaResult = getters.evaluateFormula(sheetId, `=COUNTA(${rangesArg})`);
    this.hasData = typeof countaResult === "number" && countaResult > 0;

    if (!this.hasData) {
      this.perColSections = [];
      this.perColAnalysis = [];
      return;
    }

    const zones = getters.getSelectedZones();
    const cols = analyzeColumns(zones, getters);
    const nonEmpty = cols.filter((c) => c.type !== "empty");
    this.perColAnalysis = nonEmpty;
    this.perColSections = buildStatSections(this.getters, nonEmpty, sheetId);
  }
}
