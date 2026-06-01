import { onWillUpdateProps, props, proxy, types } from "@odoo/owl";
import { formatValue } from "../../../helpers/format/format";
import { Component } from "../../../owl3_compatibility_layer";
import { MenuItemRegistry } from "../../../registries/menu_items_registry";
import { useStore } from "../../../store_engine/store_hooks";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Store } from "../../../types/store_engine";
import { Ripple } from "../../animation/ripple";
import { SidePanelStore } from "../../side_panel/side_panel/side_panel_store";
import { AggregateStatisticsStore } from "./aggregate_statistics_store";

// -----------------------------------------------------------------------------
// SpreadSheet
// -----------------------------------------------------------------------------

export class BottomBarStatistic extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-BottomBarStatistic";
  static components = { Ripple };

  protected props = props({
    openContextMenu: types.function<[x: number, y: number, registry: MenuItemRegistry]>([
      types.number(),
      types.number(),
      types.instanceOf(MenuItemRegistry),
    ]),
    closeContextMenu: types.function([]),
  });

  private state = proxy({ selectedStatisticFn: "" });
  private store!: Store<AggregateStatisticsStore>;
  private sidePanelStore!: Store<SidePanelStore>;

  setup() {
    this.store = useStore(AggregateStatisticsStore);
    this.sidePanelStore = useStore(SidePanelStore);
    onWillUpdateProps(() => {
      if (
        Object.values(this.store.statisticFnResults).every((result) => result?.value === undefined)
      ) {
        this.props.closeContextMenu();
      }
    });
  }

  getSelectedStatistic() {
    // don't display button if no function has a result
    if (
      Object.values(this.store.statisticFnResults).every((result) => result?.value === undefined)
    ) {
      return undefined;
    }
    if (this.state.selectedStatisticFn === "") {
      this.state.selectedStatisticFn = Object.keys(this.store.statisticFnResults)[0];
    }
    return this.getComposedFnName(this.state.selectedStatisticFn);
  }

  listSelectionStatistics(ev: MouseEvent) {
    const registry = new MenuItemRegistry();
    let i = 0;
    for (const [fnName] of Object.entries(this.store.statisticFnResults)) {
      registry.add(fnName, {
        name: () => this.getComposedFnName(fnName),
        sequence: i,
        isReadonlyAllowed: true,
        execute: () => {
          this.state.selectedStatisticFn = fnName;
        },
      });
      i++;
    }
    const target = ev.currentTarget as HTMLElement;
    const { top, left, width } = target.getBoundingClientRect();
    this.props.openContextMenu(left + width, top, registry);
  }

  private getComposedFnName(fnName: string): string {
    const locale = this.env.model.getters.getLocale();
    const fnValue = this.store.statisticFnResults[fnName];
    return (
      fnName +
      ": " +
      (fnValue?.value !== undefined ? formatValue(fnValue.value(), { locale }) : "__")
    );
  }

  get isDataAnalysisOpen(): boolean {
    return (
      this.sidePanelStore.mainPanel?.componentTag === "DataAnalysisPanel" &&
      this.sidePanelStore.isMainPanelOpen
    );
  }

  showDataAnalysis() {
    if (this.isDataAnalysisOpen) {
      this.sidePanelStore.closeMainPanel();
    } else {
      this.env.openSidePanel("DataAnalysisPanel", {});
      if (!this.sidePanelStore.mainPanel?.isPinned) {
        this.sidePanelStore.togglePinPanel();
      }
    }
  }
}
