import { onWillUpdateProps, proxy } from "@odoo/owl";
import { formatValue } from "../../../helpers";
import { Component } from "../../../owl3_compatibility_layer";
import { MenuItemRegistry } from "../../../registries/menu_items_registry";
import { Store, useStore } from "../../../store_engine";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Ripple } from "../../animation/ripple";
import { AggregateStatisticsStore } from "./aggregate_statistics_store";

// -----------------------------------------------------------------------------
// SpreadSheet
// -----------------------------------------------------------------------------

interface Props {
  openContextMenu: (x: number, y: number, registry: MenuItemRegistry) => void;
  closeContextMenu: () => void;
}

export class BottomBarStatistic extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-BottomBarStatistic";
  static props = {
    openContextMenu: Function,
    closeContextMenu: Function,
  };
  static components = { Ripple };

  private state = proxy({ selectedStatisticFn: "" });
  private store!: Store<AggregateStatisticsStore>;

  setup() {
    this.store = useStore(AggregateStatisticsStore);
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
}
