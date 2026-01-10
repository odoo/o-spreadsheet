import { formatValue } from "@odoo/o-spreadsheet-engine/helpers/format/format";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, onWillUpdateProps } from "@odoo/owl";
import { MenuItemRegistry } from "../../../registries/menu_items_registry";
import { Store, useStore } from "../../../store_engine";
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

  selectedStatisticFn: string = "";
  private store!: Store<AggregateStatisticsStore>;

  setup() {
    this.store = useStore(AggregateStatisticsStore);
    onWillUpdateProps(() => {
      if (Object.values(this.store.statisticFnResults).every((result) => result === undefined)) {
        this.props.closeContextMenu();
      }
    });
  }

  getSelectedStatistic() {
    // don't display button if no function has a result
    if (Object.values(this.store.statisticFnResults).every((result) => result === undefined)) {
      return undefined;
    }
    if (this.selectedStatisticFn === "") {
      this.selectedStatisticFn = Object.keys(this.store.statisticFnResults)[0];
    }
    return this.getComposedFnName(this.selectedStatisticFn);
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
          this.selectedStatisticFn = fnName;
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
      fnName + ": " + (fnValue !== undefined ? formatValue({ value: fnValue() }, locale) : "__")
    );
  }
}
