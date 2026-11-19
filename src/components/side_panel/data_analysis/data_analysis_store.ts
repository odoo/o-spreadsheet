import { hasSameRowSpan } from "../../../helpers/data_analysis";
import {
  ChartSuggestion,
  getChartSuggestions,
} from "../../../helpers/figures/charts/chart_suggestion_engine";
import { zoneToXc } from "../../../helpers/zones";
import { SpreadsheetStore } from "../../../stores/spreadsheet_store";
import { _t } from "../../../translation";
import { CellValueType } from "../../../types/cells";
import { Command, invalidateEvaluationCommands } from "../../../types/commands";
import { Get } from "../../../types/store_engine";

export class DataAnalysisStore extends SpreadsheetStore {
  mutators = [] as const;
  hasData: boolean = false;
  chartSuggestions: ChartSuggestion[] = [];
  private isDirty = false;
  ranges?: string[];
  private hasSameRowSpan = true;

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

  get emptyMessage(): string {
    if (!this.hasData) {
      return _t(
        "Select cells containing data to see chart suggestions. Note that the order of selected columns can impact chart suggestions."
      );
    }
    if (!this.hasSameRowSpan) {
      return _t(
        "The selected columns don't cover the same rows. Select the same rows in each column to see chart suggestions."
      );
    }
    return _t(
      "No chart suggestions available for the selected data. Note that the order of selected columns can impact chart suggestions."
    );
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

    this.hasSameRowSpan = hasSameRowSpan(zones);

    const suggestions = this.hasData ? getChartSuggestions(zones, this.getters) : [];
    this.chartSuggestions = suggestions;
  }
}
