import { toXC } from "@odoo/o-spreadsheet-engine/helpers/coordinates";
import { CellPosition } from "@odoo/o-spreadsheet-engine/types/misc";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useState } from "@odoo/owl";
import { Section } from "../components/section/section";

interface Props {
  onCloseSidePanel: () => void;
}

type SortKey = "totalTime" | "selfTime";

const MAX_VISIBLE_ROWS = 1000;

interface EvaluationProfilerState {
  sortKey: SortKey;
  hasResults: boolean;
  totalCount: number;
}

interface TimingRow {
  position: CellPosition;
  sheetName: string;
  xc: string;
  selfTime: number;
  totalTime: number;
}

export class EvaluationProfilerPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-EvaluationProfilerPanel";
  static components = { Section };
  static props = { onCloseSidePanel: Function };

  state: EvaluationProfilerState = useState({
    sortKey: "totalTime",
    hasResults: false,
    totalCount: 0,
  });

  runProfiling() {
    this.env.model.dispatch("PROFILE_CELLS");
    this.state.hasResults = true;
  }

  get sortedTimings(): TimingRow[] {
    const getters = this.env.model.getters;
    const sortKey = this.state.sortKey;

    const rows: TimingRow[] = [];
    for (const sheetId of getters.getSheetIds()) {
      const sheetName = getters.getSheetName(sheetId);
      for (const { position, timing } of getters.getCellTimings(sheetId)) {
        rows.push({
          position,
          sheetName,
          xc: toXC(position.col, position.row),
          selfTime: timing.selfTime,
          totalTime: timing.totalTime,
        });
      }
    }
    const filtered = rows
      .filter((row) => row.totalTime >= 0.001)
      .sort((a, b) => b[sortKey] - a[sortKey]);
    this.state.totalCount = filtered.length;
    return filtered.slice(0, MAX_VISIBLE_ROWS);
  }

  setSortKey(key: SortKey) {
    this.state.sortKey = key;
  }

  selectCell(position: CellPosition) {
    const getters = this.env.model.getters;
    const activeSheetId = getters.getActiveSheetId();
    if (position.sheetId !== activeSheetId) {
      this.env.model.dispatch("ACTIVATE_SHEET", {
        sheetIdFrom: activeSheetId,
        sheetIdTo: position.sheetId,
      });
    }
    this.env.model.selection.selectCell(position.col, position.row);
  }

  get maxVisibleRows() {
    return MAX_VISIBLE_ROWS;
  }

  formatTime(ms: number): string {
    if (ms < 1) {
      return `${(ms * 1000).toFixed(0)} μs`;
    }
    return `${ms.toFixed(2)} ms`;
  }
}
