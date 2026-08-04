import { proxy } from "@odoo/owl";
import { formatTime, humanizeNumber } from "../../../helpers/format/format";
import { useLayoutEffect } from "../../../owl3_compatibility_layer";
import { PerfProfile, RangeTiming } from "../../../types/functions";
import { Highlight } from "../../../types/misc";
import { useHighlights } from "../../helpers/highlight_hook";
import { OSComponent } from "../../os_component";
import { Section } from "../components/section/section";
import { PerfItem } from "./perf_item";

const HIGHLIGHT_COLOR = "#e28f08";

export class FormulasPerformance extends OSComponent {
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
    return this.model().getters.getPerfProfile();
  }

  get totalTime(): number {
    return this.perfProfile?.totalTime ?? 0;
  }

  stringifyRange({ range }: RangeTiming) {
    return this.model().getters.getRangeString(range, "forceSheetReference");
  }

  isSelected(index: number): boolean {
    return this.state.selectedIndex === index;
  }

  selectEntry(index: number) {
    this.state.selectedIndex = index;
    const entry = this.perfProfile?.entries[index];
    if (!entry || !this.model().getters.tryGetSheet(entry.range.sheetId)) {
      return;
    }
    const activeSheetId = this.model().getters.getActiveSheetId();
    if (entry.range.sheetId !== activeSheetId) {
      this.model().dispatch("ACTIVATE_SHEET", {
        sheetIdFrom: activeSheetId,
        sheetIdTo: entry.range.sheetId,
      });
    }
    const zone = entry.range.zone;
    // Select the bottom right cell of the range first to ensure most of
    // the range is visible.
    this.model().selection.selectCell(zone.right, zone.bottom);
    this.model().selection.selectCell(zone.left, zone.top);
  }

  formatTime(ms: number): string {
    const locale = this.model().getters.getLocale();
    return formatTime(ms, locale);
  }

  humanize(time: number): string {
    const locale = this.model().getters.getLocale();
    return humanizeNumber({ value: time }, locale);
  }
}
