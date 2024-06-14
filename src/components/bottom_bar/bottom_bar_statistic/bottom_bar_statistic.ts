import { Component, onWillUpdateProps } from "@odoo/owl";
import { formatValue } from "../../../helpers/format";
import { MenuItemRegistry } from "../../../registries/menu_items_registry";
import { Store, useStore } from "../../../store_engine";
import { SpreadsheetChildEnv } from "../../../types";
import { Ripple } from "../../animation/ripple";
import { css } from "../../helpers/css";
import { AggregateStatisticsStore } from "./aggregate_statistics_store";

// -----------------------------------------------------------------------------
// SpreadSheet
// -----------------------------------------------------------------------------

css/* scss */ `
  .o-selection-statistic {
    margin-right: 20px;
    padding: 4px 4px 4px 8px;
    color: #333;
    cursor: pointer;
    &:hover {
      background-color: rgba(0, 0, 0, 0.08) !important;
    }
  }
`;

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
    for (let [fnName] of Object.entries(this.store.statisticFnResults)) {
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
    return fnName + ": " + (fnValue !== undefined ? formatValue(fnValue(), { locale }) : "__");
  }
}
