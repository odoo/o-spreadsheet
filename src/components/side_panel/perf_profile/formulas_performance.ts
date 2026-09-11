import { proxy } from "@odoo/owl";
import { formatTime, humanizeNumber } from "../../../helpers/format/format";
import { Component, useLayoutEffect } from "../../../owl3_compatibility_layer";
import { PerfProfile, RangeTiming } from "../../../types/functions";
import { Highlight } from "../../../types/misc";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { useHighlights } from "../../helpers/highlight_hook";
import { Section } from "../components/section/section";
import { PerfItem } from "./perf_item";

const HIGHLIGHT_COLOR = "#e28f08";

export class FormulasPerformance extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FormulasPerformance";
  static components = { Section, PerfItem };

  private state = proxy({
    selectedIndex: undefined as number | undefined,
  });

  setup() {
    useHighlights(this);
    useLayoutEffect(
      () => {
        this.state.selectedIndex = undefined;
      },
      () => [this.perfProfile]
    );
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

  get perfProfile(): PerfProfile | undefined {
    return this.env.model.getters.getPerfProfile();
  }

  get totalTime(): number {
    return this.perfProfile?.totalTime ?? 0;
  }

  stringifyRange({ range }: RangeTiming) {
    return this.env.model.getters.getRangeString(range, "forceSheetReference");
  }

  isSelected(index: number): boolean {
    return this.state.selectedIndex === index;
  }

  selectEntry(index: number) {
    this.state.selectedIndex = index;
    const entry = this.perfProfile?.entries[index];
    if (!entry || !this.env.model.getters.tryGetSheet(entry.range.sheetId)) {
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
    // Select the bottom right cell of the range first to ensure most of
    // the range is visible.
    this.env.model.selection.selectCell(zone.right, zone.bottom);
    this.env.model.selection.selectCell(zone.left, zone.top);
  }

  formatTime(ms: number): string {
    const locale = this.env.model.getters.getLocale();
    return formatTime(ms, locale);
  }

  humanize(time: number): string {
    const locale = this.env.model.getters.getLocale();
    return humanizeNumber({ value: time }, locale);
  }
}
