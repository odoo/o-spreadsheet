import { markup, props, proxy, types } from "@odoo/owl";
import {
  ChartSuggestion,
  getChartSuggestions,
} from "../../../helpers/figures/charts/chart_suggestion_engine";
import { toZone } from "../../../helpers/zones";
import { Component } from "../../../owl3_compatibility_layer";
import { useLocalStore } from "../../../store_engine/store_hooks";
import { ValueAndLabel, Zone } from "../../../types/misc";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Store } from "../../../types/store_engine";
import { Select } from "../../select/select";
import { SidePanelCollapsible } from "../components/collapsible/side_panel_collapsible";
import { Section } from "../components/section/section";
import { ChartSuggestionPreview } from "./chart_suggestion_preview";
import { DataAnalysisStore, StatSection } from "./data_analysis_store";

export class DataAnalysisPanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataAnalysisPanel";
  protected props = props({ onCloseSidePanel: types.function() });
  static components = {
    SidePanelCollapsible,
    Section,
    ChartSuggestionPreview,
    Select,
  };

  store!: Store<DataAnalysisStore>;
  selectedCol = proxy({ index: 0 });
  openDescriptionKey = proxy({ value: "" });

  setup() {
    this.store = useLocalStore(DataAnalysisStore);
  }

  get columnSelectOptions(): ValueAndLabel[] {
    return this.store.perColSections.map((s, i) => ({
      value: String(i),
      label: markup(
        `${s.title}&nbsp;<span class="text-muted fw-normal small">(${s.range})</span>`
      ) as unknown as string,
    }));
  }

  get activeColSection(): StatSection | undefined {
    const sections = this.store.perColSections;
    if (!sections.length) {
      return undefined;
    }
    return sections[Math.min(this.selectedCol.index, sections.length - 1)];
  }

  get selectedColValue(): string {
    const sections = this.store.perColSections;
    if (!sections.length) {
      return "0";
    }
    return String(Math.min(this.selectedCol.index, sections.length - 1));
  }

  onColChange(value: string) {
    this.selectedCol.index = Number(value);
    this.openDescriptionKey.value = "";
  }

  toggleDescription(key: string) {
    this.openDescriptionKey.value = this.openDescriptionKey.value === key ? "" : key;
  }

  get chartSuggestions(): ChartSuggestion[] {
    return getChartSuggestions(
      this.store.ranges?.map((range) => toZone(range)) ?? [],
      this.env.model.getters
    );
  }

  startDragAndDrop(formula: string, _ev: MouseEvent) {
    const gridOverlay = document.querySelector(".o-grid-overlay") as HTMLElement | null;
    if (!gridOverlay) {
      return;
    }

    const spreadsheet = document.querySelector(".o-spreadsheet") as HTMLElement | null;
    if (!spreadsheet) {
      return;
    }

    const savedZones = this.env.model.getters.getSelectedZones();

    const label = document.createElement("div");
    label.textContent = formula;
    label.className = "o-stat-dragged";
    spreadsheet.appendChild(label);

    const onMouseMove = (e: MouseEvent) => {
      label.style.left = `${e.clientX + 10}px`;
      label.style.top = `${e.clientY}px`;
    };

    const onMouseUp = (e: MouseEvent) => {
      spreadsheet.removeChild(label);
      const gridRect = gridOverlay.getBoundingClientRect();
      if (
        e.clientX > gridRect.left &&
        e.clientX < gridRect.right &&
        e.clientY > gridRect.top &&
        e.clientY < gridRect.bottom
      ) {
        const { scrollX, scrollY } = this.env.model.getters.getActiveSheetScrollInfo();
        const x = e.clientX - gridRect.left + scrollX;
        const y = e.clientY - gridRect.top + scrollY;
        const { col, row } = this.env.model.getters.getPositionAnchorOffset({ x, y });
        this.env.model.dispatch("UPDATE_CELL", {
          sheetId: this.env.model.getters.getActiveSheetId(),
          col,
          row,
          content: formula,
        });
      }
      this.restoreSelection(savedZones);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  private restoreSelection(zones: Zone[]) {
    if (zones.length === 0) {
      return;
    }
    const selection = this.env.model.selection;
    const [first, ...others] = zones;
    selection.selectZone(
      { zone: first, cell: { col: first.left, row: first.top } },
      { scrollIntoView: false }
    );
    for (const zone of others) {
      selection.addCellToSelection(zone.left, zone.top);
      if (zone.right !== zone.left || zone.bottom !== zone.top) {
        selection.setAnchorCorner(zone.right, zone.bottom);
      }
    }
  }
}
