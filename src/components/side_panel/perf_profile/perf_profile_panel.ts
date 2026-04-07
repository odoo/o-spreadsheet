import { Component, useState } from "@odoo/owl";
import { formatValue, humanizeNumber } from "../../../helpers";
import { _t } from "../../../translation";
import { Highlight, PerfProfile, RangeTiming } from "../../../types";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { useHighlights } from "../../helpers/highlight_hook";
import { Section } from "../components/section/section";

const HIGHLIGHT_COLOR = "#e28f08";

interface Props {
  onCloseSidePanel: () => void;
}

export class PerfProfilePanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PerfProfilePanel";
  static components = { Section };
  static props = { onCloseSidePanel: Function };

  private state = useState({
    selectedIndex: undefined as number | undefined,
  });

  setup() {
    useHighlights(this);
  }

  get perfProfile(): PerfProfile | undefined {
    return this.env.model.getters.getPerfProfile();
  }

  get highlights(): Highlight[] {
    const index = this.state.selectedIndex;
    if (index === undefined) {
      return [];
    }
    const entry = this.perfProfile?.entries[index];
    if (!entry) {
      return [];
    }
    return [{ range: entry.range, color: HIGHLIGHT_COLOR, noFill: true }];
  }

  stringifyRange({ range }: RangeTiming) {
    return this.env.model.getters.getRangeString(range, "forceSheetReference");
  }

  startProfiling() {
    this.state.selectedIndex = undefined;
    this.env.model.dispatch("EVALUATE_CELLS", { profiling: true });
  }

  isSelected(index: number): boolean {
    return this.state.selectedIndex === index;
  }

  selectEntry(index: number) {
    this.state.selectedIndex = index;
    const entry = this.perfProfile?.entries[index];
    if (!entry) {
      return;
    }
    const activeSheetId = this.env.model.getters.getActiveSheetId();
    if (entry.range.sheetId !== activeSheetId) {
      this.env.model.dispatch("ACTIVATE_SHEET", {
        sheetIdFrom: activeSheetId,
        sheetIdTo: entry.range.sheetId,
      });
    }
    const zone = entry.range.zone;
    this.env.model.selection.selectCell(zone.right, zone.bottom); // Select the bottom right cell of the range to move the viewport there
    this.env.model.selection.selectCell(zone.left, zone.top);
  }

  formatTime(ms: number): string {
    const locale = this.env.model.getters.getLocale();
    if (ms >= 1000) {
      return _t("%(seconds)s s", {
        seconds: formatValue(ms / 1000, { format: "0.00", locale }),
      });
    }
    return _t("%(milliseconds)s ms", {
      milliseconds: formatValue(ms, { format: "0.00", locale }),
    });
  }

  humanize(time: number): string {
    const locale = this.env.model.getters.getLocale();
    return humanizeNumber({ value: time }, locale);
  }

  formatPercent(time: number): string {
    const total = this.perfProfile?.totalTime;
    if (!total) {
      return "0.0%";
    }
    return formatValue(time / total, {
      format: "0.0%",
      locale: this.env.model.getters.getLocale(),
    });
  }

  barWidth(entry: RangeTiming): number {
    const totalTime = this.perfProfile?.totalTime ?? 0;
    if (!totalTime) {
      return 0;
    }
    return (entry.time / totalTime) * 100;
  }
}
