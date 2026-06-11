import { onWillUpdateProps, props, proxy } from "@odoo/owl";
import { HIGHLIGHT_COLOR } from "../../../constants";
import { lightenColor } from "../../../helpers/color";
import {
  ChartSuggestion,
  getChartSuggestions,
} from "../../../helpers/figures/charts/chart_suggestion_engine";
import { toZone, zoneToXc } from "../../../helpers/zones";
import { Component } from "../../../owl3_compatibility_layer";
import { useLocalStore } from "../../../store_engine/store_hooks";
import { _t } from "../../../translation";
import { Highlight, UID, Zone } from "../../../types/misc";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Store } from "../../../types/store_engine";
import { useHighlights } from "../../helpers/highlight_hook";
import { NumberInput } from "../../number_input/number_input";
import { types } from "../../props_validation";
import { SelectionInput } from "../../selection_input/selection_input";
import { BadgeSelection } from "../components/badge_selection/badge_selection";
import { SidePanelCollapsible } from "../components/collapsible/side_panel_collapsible";
import { Section } from "../components/section/section";
import { ChartSuggestionPreview } from "./chart_suggestion_preview";
import { DataAnalysisStore } from "./data_analysis_store";

interface Props {
  onCloseSidePanel: () => void;
  zones: Zone[];
}

const CURRENT_SELECTION_COLOR = lightenColor(HIGHLIGHT_COLOR, 0.25);

export class DataAnalysisPanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataAnalysisPanel";
  protected props = props({ onCloseSidePanel: types.function(), zones: types.array(types.Zone()) });
  static components = {
    NumberInput,
    SidePanelCollapsible,
    BadgeSelection,
    Section,
    SelectionInput,
    ChartSuggestionPreview,
  };

  state = proxy({
    currentChart: "count",
    currentFrequencyOrder: "descending",
    highlightPositions: [] as { row: number; col: number }[],
    pendingRanges: [] as string[],
  });

  store!: Store<DataAnalysisStore>;
  private sheetId?: UID;
  private lastPropsZones: string[] = [];

  setup() {
    this.sheetId = this.env.model.getters.getActiveSheetId();
    const initialRanges = this.props.zones.map(zoneToXc);
    this.lastPropsZones = initialRanges;
    this.state.pendingRanges = initialRanges;
    this.store = useLocalStore(DataAnalysisStore, initialRanges);
    useHighlights(this);
    onWillUpdateProps((nextProps: Props) => {
      const newRanges = nextProps.zones.map(zoneToXc);
      if (
        newRanges.length !== this.lastPropsZones.length ||
        newRanges.some((r, i) => r !== this.lastPropsZones[i])
      ) {
        this.lastPropsZones = newRanges;
        this.state.pendingRanges = newRanges;
        this.store.updateRanges(newRanges);
      }
    });
  }

  get frequencyOrders() {
    return [
      { value: "descending", label: _t("Descending"), icon: "o-spreadsheet-Icon.DESCENDING_SORT" },
      { value: "ascending", label: _t("Ascending"), icon: "o-spreadsheet-Icon.ASCENDING_SORT" },
    ];
  }

  get chartSuggestions(): ChartSuggestion[] {
    return getChartSuggestions(
      this.store.ranges?.map((range) => toZone(range)) ?? [],
      this.env.model.getters
    );
  }

  switchChart(chartType: string) {
    this.state.currentChart = chartType;
  }

  onRangeUpdate(ranges: string[]) {
    this.state.pendingRanges = ranges;
  }

  onRangeConfirmed() {
    this.store.updateRanges(this.state.pendingRanges);
  }

  switchFrequencyOrder(order: string) {
    this.state.currentFrequencyOrder = order;
  }

  get valueFrequencies(): { value: string; count: number }[] {
    const orderingCriterion =
      this.state.currentFrequencyOrder === "ascending"
        ? (a: { count: number }, b: { count: number }) => a.count - b.count
        : (a: { count: number }, b: { count: number }) => b.count - a.count;
    return this.store.valueFrequencies.sort(orderingCriterion).slice(0, 5);
  }

  get highlights(): Highlight[] {
    const sheetId = this.env.model.getters.getActiveSheetId();
    if (sheetId !== this.sheetId) {
      return [];
    }
    return (
      this.store.ranges?.map((range) => ({
        range: this.env.model.getters.getRangeFromSheetXC(sheetId, range),
        color: CURRENT_SELECTION_COLOR,
        interactive: false,
      })) ?? []
    );
  }

  highlightFrequencyPositions(positions: { row: number; col: number }[]) {
    this.state.highlightPositions = positions;
  }

  clearHighlights() {
    this.state.highlightPositions = [];
  }
}
